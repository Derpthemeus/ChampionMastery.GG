import {Champion, ChampionList, ChampionListEntry, Highscore, Region, Summoner} from "./types";
import * as apiHandler from "./apiHandler";
import {APIError} from "./apiHandler";
import {renderSummoner} from "./routes/summoner";
import {renderChampion} from "./routes/champion";
import {renderHighscores} from "./routes/highscores";
import Highscores from "./Highscores";
import Config from "./Config";
import * as imageDownloader from "./imageDownloader";
import express = require("express");
import fs = require("fs");
import path = require("path");
import handlebars = require("handlebars");
import expressHandlebars = require("express-handlebars");
import VError = require("verror");
const layouts = require("handlebars-layouts");
const helpers = require("handlebars-helpers");

/** The path of a text file containing the DDragon version of the currently downloaded images */
const ddragonVersionPath: string = path.join(__dirname, "..", "ddragonVersion.txt");
/** Regions mapped to their ID */
export const REGIONS: Map<string, Region> = new Map([
	["NA", {id: "NA", platformId: "NA1"}],
	["EUW", {id: "EUW", platformId: "EUW1"}],
	["EUNE", {id: "EUNE", platformId: "EUN1"}],
	["BR", {id: "BR", platformId: "BR1"}],
	["OCE", {id: "OCE", platformId: "OC1"}],
	["KR", {id: "KR", platformId: "KR"}],
	["TR", {id: "TR", platformId: "TR1"}],
	["LAS", {id: "LAS", platformId: "LA2"}],
	["LAN", {id: "LAN", platformId: "LA1"}],
	["RU", {id: "RU", platformId: "RU"}],
	["JP", {id: "JP", platformId: "JP1"}]
]);
/** Data that is used in every rendered view */
export const COMMON_DATA: {regions: string[], announcement: {message: string, link: string}} = {
	regions: [...REGIONS.keys()],
	announcement: Config.announcement
};

export let highscores: Highscores;

/** Champions mapped to their ID, in alphabetical order of their name (with "Total" first) */
export let CHAMPIONS: Map<number, Champion>;
const app = express();
/** The DDragon version currently being used */
export let ddragonVersion: string;

/**
 * Used to display highscores as raw JSON data
 * @param req
 * @param res
 */
function renderRawData(req: express.Request, res: express.Response): void {
	res.status(200).json(highscores.highscores);
}

/**
 * Returns a standardized name (all lowercase with spaces removed)
 * @param name
 * @returns The standardized name
 */
export function standardizeName(name: string): string {
	return name.replace(/ /g, "").toLowerCase();
}

/**
 * Tries to find the summoner with a given name, first checking the cache then the API.
 * If the API returns a 404 for the name, this will check if a summoner with the specified name is in the highscores list.
 * If the summoner is found in the highscores, they will be looked up by their stored ID.
 * @param region
 * @param summonerName
 * @async
 * @returns An object containing the Summoner and the property "hasNewName". If the summoner was found through the fallback method, "hasNewName" will be set to true.
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs. If the thrown error has a status code of 404, it means the summoner could not be found by name, and a fallback ID could not be found or didn't work.
 */
export async function getSummoner(region: Region, summonerName: string): Promise<{summoner: Summoner, hasNewName: boolean}> {
	try {
		const summoner: Summoner = await apiHandler.getSummonerByName(region, summonerName);
		return {hasNewName: false, summoner: summoner};
	} catch (ex) {
		if (ex instanceof apiHandler.APIError && ex.statusCode === 404) {
			// Check if this player is on the highscores with their old name
			const standardizedName: string = standardizeName(summonerName);
			for (const champion of CHAMPIONS.values()) {
				const championScores: Highscore[] = highscores.getChampionHighscores(champion.id);
				for (const score of championScores) {
					if (standardizedName === score.standardizedName && region.id === score.region) {
						try {
							const summoner: Summoner = await apiHandler.getSummonerById(region, score.id);
							return {hasNewName: true, summoner: summoner};
						} catch (ex) {
							if (ex instanceof APIError && ex.statusCode === 404) {
								// This error can potentially be caused by the player transferring regions. It will need to be fixed manually.
								console.error(`Unable to find summoner "${score.name}" on ${score.region} (ID: ${score.id})`);
							}
						}
					}
				}
			}
		}
		throw ex;
	}
}



/**
 * Displays an error message.
 * @param res The Response to send the error to
 * @param code The HTTP status code to use
 * @param error A short summary of the error
 * @param details More info about the error (optional)
 */
export function renderError(res: express.Response, code: number, error: string, details?: string): void {
	res.status(code).render("error", {
		...COMMON_DATA,
		error: {
			error: error,
			details: details
		}
	});
}

/**
 * Sets up a page that doesn't use the express.Request object for anything, and only uses data from COMMON_DATA
 * @param path The path of the page
 * @param view The name of the template to use
 */
function useStaticPage(path: string, view: string): void {
	app.get(path, (req, res) => {
		res.status(200).render(view, {
			...COMMON_DATA
		});
	});
}

/**
 * Updates the current DDragon version, champion list, and images from DDragon to the latest version.
 * Does nothing if everything is already up to date.
 * @async
 * @throws {Error} Thrown if an error occurs while updating data. If this happens, some static data may be updated and
 * other parts will continue using old data (if an older version of the data was already downloaded).
 */
async function updateStaticData(): Promise<void> {
	return new Promise<void>(async (resolve: Function, reject: Function) => {
		console.log("Updating static data...");
		let championList: ChampionList;
		try {
			championList = await apiHandler.getChampions();
		} catch (ex) {
			reject(new VError(ex, "Error retrieving champion list"));
			return;
		}
		console.log("Retrieved champion list");

		if (championList.version !== ddragonVersion) {
			/** Champions mapped to their ID (unsorted) */
			const champions: Map<number, Champion> = new Map<number, Champion>();
			for (const key of Object.keys(championList.data)) {
				const champion: ChampionListEntry = championList.data[key];
				champions.set(champion.id, {
					id: champion.id,
					name: champion.name,
					icon: champion.image.full
				});
			}

			CHAMPIONS = new Map<number, Champion>([
				// Set "Total Points" to be the first entry in the new Map
				[-1, {
					id: -1,
					name: "Total Points",
					// This is relative to the profileIcons directory
					icon: "../masteryIcon.png"
				}],
				// Add all champions to the new Map, in alphabetical order of their name
				...[...champions.entries()].sort((a: [number, Champion], b: [number, Champion]) => {
					const nameA: string = a[1].name.toUpperCase();
					const nameB: string = b[1].name.toUpperCase();
					return (nameA < nameB) ? -1 : 1;
				})
			]);

			// Add new champions to highscores
			for (const champion of CHAMPIONS.values()) {
				if (!highscores.getChampionHighscores(champion.id)) {
					highscores.highscores[champion.id] = [];
				}
			}

			console.log("Updated champion list");
		} else {
			console.log("Champion list is already up to date");
		}

		/* If data is being downloaded for the first time (indicated by ddragonVersion being undefined), check the
		version of the currently downloaded icons. This is checked here (not earlier) because the champion list needs
		to be updated every time the server starts (since the list is not persisted through restarts), so having ddragonVersion undefined
		until now accurately reflects the currently downloaded version of DDragon as far as the champion list is concerned. */
		if (!ddragonVersion) {
			if (fs.existsSync(ddragonVersionPath)) {
				try {
					ddragonVersion = fs.readFileSync(ddragonVersionPath, "utf-8");
				} catch (ex) {
					// This error isn't critical, so it's just logged instead of thrown
					console.error(VError.fullStack(new VError(ex, `Error loading DDragon version from ${ddragonVersionPath}`)));
				}
			}
		}

		// Download images (if needed)
		if (championList.version !== ddragonVersion || !fs.existsSync(imageDownloader.profileIconsPath) || !fs.existsSync(imageDownloader.championIconsPath)) {
			try {
				await imageDownloader.downloadImages(championList.version);
				ddragonVersion = championList.version;
				// Save the latest DDragon version to ddragonVersion.txt
				try {
					fs.writeFileSync(ddragonVersionPath, ddragonVersion, "utf-8");
				} catch (ex) {
					// This error isn't critical, so it's just logged instead of thrown
					console.error(VError.fullStack(new VError(ex, "Error saving latest DDragon version")));
				}

				console.log("Updated static data. Latest version:", ddragonVersion);
				resolve();
			} catch (ex) {
				reject(new VError(ex, "Error updating static data images"));
			}
		} else {
			console.log("Images are already up to date");
			resolve();
		}
	});
}

async function start(): Promise<void> {
	console.log("Starting server...");

	try {
		if (fs.existsSync(Config.highscoreDataPath)) {
			// Load existing highscores
			const json: string = fs.readFileSync(Config.highscoreDataPath, "utf8");
			highscores = new Highscores(JSON.parse(json));
		} else {
			// Create a new highscores list
			highscores = new Highscores({});
		}
	} catch (ex) {
		console.error(VError.fullStack(new VError(ex, "CRITICAL ERROR LOADING HIGHSCORE DATA")));
		process.exit(1);
	}
	console.log("Loaded highscore data");

	try {
		await updateStaticData();
	} catch (ex) {
		console.error(VError.fullStack(new VError(ex, "CRITICAL ERROR UPDATING STATIC DATA")));
		process.exit(1);
	}

	// Schedule static data updater
	setInterval(async () => {
		try {
			await updateStaticData();
		} catch (ex) {
			console.error(VError.fullStack(new VError(ex, "Error updating static data (will continue using older version)")));
		}
	}, Config.staticDataUpdateInterval * 1000 * 60);

	layouts.register(handlebars);

	// gte, eq
	helpers.comparison();
	// ordinalize
	helpers.inflection();
	// lowercase
	helpers.string();
	// add
	helpers.math();
	// encodeURI
	helpers.url();

	const viewsPath: string = path.join(__dirname, "..", "views");
	app.engine("handlebars", expressHandlebars());
	app.set("view engine", "handlebars");
	app.set("views", viewsPath);

	handlebars.registerPartial("layout", fs.readFileSync(path.join(viewsPath, "layout.handlebars"), "utf8"));

	app.use(express.static(path.join(__dirname, "..", "public")));
	useStaticPage("/", "home");
	useStaticPage("/faq", "faq");
	useStaticPage("/legal", "legal");
	app.get("/highscores", renderHighscores);
	app.get("/champion", renderChampion);
	app.get("/summoner", renderSummoner);
	app.get("/downloadData", renderRawData);

	setInterval(highscores.saveHighscores, Config.saveInterval * 1000);

	app.listen(Config.serverPort, Config.serverAddress);
	console.log("Server started");
}

start();
