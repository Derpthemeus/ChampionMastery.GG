import {Highscore, Summoner} from "./types";
import Champion from "./Champion";
import Region from "./Region";
import * as apiHandler from "./apiHandler";
import {APIError} from "./apiHandler";
import {renderSummoner} from "./routes/summoner";
import {renderChampion} from "./routes/champion";
import {renderHighscores} from "./routes/highscores";
import Highscores from "./Highscores";
import Config from "./Config";
import * as staticDataUpdater from "./staticDataUpdater";
import express = require("express");
import fs = require("fs");
import path = require("path");
import handlebars = require("handlebars");
import expressHandlebars = require("express-handlebars");
import VError = require("verror");
const layouts = require("handlebars-layouts");
const helpers = require("handlebars-helpers");

/** Data that is used in every rendered view */
export const COMMON_DATA: {regions: string[], announcement: {message: string, link: string}} = {
	regions: [...Region.REGIONS.keys()],
	announcement: Config.announcement
};

export let highscores: Highscores;

const app = express();

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
 * @throws {RateLimitError} Thrown if the API request is prevented due to an exceeded rate limit
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
			for (const champion of Champion.CHAMPIONS.values()) {
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
 * @param pagePath The path of the page
 * @param view The name of the template to use
 */
function useStaticPage(pagePath: string, view: string): void {
	app.get(pagePath, (req, res) => {
		res.status(200).render(view, {
			...COMMON_DATA
		});
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
		await staticDataUpdater.updateStaticData();
	} catch (ex) {
		console.error(VError.fullStack(new VError(ex, "CRITICAL ERROR UPDATING STATIC DATA")));
		process.exit(1);
	}

	// Schedule static data updater
	setInterval(() => {
		staticDataUpdater.updateStaticData().catch((ex) => {
			console.error(VError.fullStack(new VError(ex, "Error updating static data (will continue using older version)")));
		});
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
	app.use("/img", express.static(staticDataUpdater.imagesPath));
	useStaticPage("/", "home");
	useStaticPage("/faq", "faq");
	useStaticPage("/legal", "legal");
	app.get("/highscores", renderHighscores);
	app.get("/champion", renderChampion);
	app.get("/summoner", renderSummoner);

	setInterval(highscores.saveHighscores, Config.saveInterval * 1000);

	app.listen(Config.serverPort, Config.serverAddress);
	console.log("Server started");
}

start();
