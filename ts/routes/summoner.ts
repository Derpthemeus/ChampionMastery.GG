import {ChampionMasteryInfo, Summoner} from "../types";
import Region from "../Region";
import * as apiHandler from "../apiHandler";
import {COMMON_DATA, getSummoner, highscores, renderError} from "../server";
import Champion from "../Champion";
import {RateLimitError} from "../RateLimiter";
import express = require("express");
import XRegExp = require("xregexp");
import handlebars = require("handlebars");
import VError = require("verror");

/** A regex to match valid summoner names (from https://developer.riotgames.com/getting-started.html) */
const SUMMONER_NAME_REGEX = XRegExp("^[0-9\\p{L} _\\.]+$");
/** How many tokens are needed to continue from a level (the key) to the next */
const TOKENS_NEEDED = new Map([[5, 2], [6, 3]]);

export async function renderSummoner(req: express.Request, res: express.Response): Promise<void> {
	if (!req.query.summoner || typeof req.query.summoner !== "string") {
		renderError(res, 400, "No summoner name specified");
		return;
	}

	if (!req.query.region || typeof req.query.region !== "string") {
		renderError(res, 400, "No region specified");
		return;
	}

	const region: Region = Region.REGIONS.get(req.query.region.toUpperCase());
	if (!region) {
		renderError(res, 400, "Invalid region");
		return;
	}

	if (!SUMMONER_NAME_REGEX.test(req.query.summoner)) {
		renderError(res, 400, "Name contains invalid characters", "Make sure the summoner name is correct.");
		return;
	}

	try {
		const summonerInfo: {summoner: Summoner, hasNewName: boolean} = await getSummoner(region, req.query.summoner);
		const summoner: Summoner = summonerInfo.summoner;
		if (summonerInfo.hasNewName) {
			res.redirect(302, `?summoner=${encodeURIComponent(summoner.standardizedName)}&region=${region.id}`);
			return;
		}

		const masteries: ChampionMasteryInfo[] = await apiHandler.getChampionMasteries(region, summoner.id);

		highscores.updateAllHighscores(masteries, summoner, region);

		const champions: ChampionInfo[] = new Array(masteries.length);

		let totalLevel: number = 0, totalPoints: number = 0, totalChests: number = 0;
		for (let i = 0; i < masteries.length; i++) {
			const masteryChampion: ChampionMasteryInfo = masteries[i];

			totalLevel += masteryChampion.championLevel;
			totalPoints += masteryChampion.championPoints;
			if (masteryChampion.chestGranted) {
				totalChests++;
			}

			/** The tooltip to display when hovering over the champion progress cell */
			let tooltip: string;
			/**
			 * The number used to sort champions when sorting by progress.
			 * Levels 1-4 have a sorting value equal to their percentage progression to next level. Levels 5-6 have a sorting value of "L0T", where "L" is the level and "T" is the tokens earned.
			 */
			let sortingValue: number;
			let pointsToNextLevel: number;

			if (masteryChampion.championLevel < 5) {
				// The percentage to the next level, rounded to 2 decimal places
				sortingValue = Math.round(masteryChampion.championPointsSinceLastLevel / (masteryChampion.championPointsSinceLastLevel + masteryChampion.championPointsUntilNextLevel) * 10000) / 100;
				tooltip = `${masteryChampion.championPointsSinceLastLevel}/${masteryChampion.championPointsSinceLastLevel + masteryChampion.championPointsUntilNextLevel} points (${sortingValue}%)`;
				pointsToNextLevel = masteryChampion.championPointsUntilNextLevel;
			} else {
				sortingValue = (100 * masteryChampion.championLevel) + masteryChampion.tokensEarned;
				// Using a higher value to keep lvl 5 and above at the end of the ascending sort
				pointsToNextLevel = 90000 + (100 * masteryChampion.championLevel);

				if (masteryChampion.championLevel === 7) {
					tooltip = "Max level";
				} else {
					tooltip = `${masteryChampion.tokensEarned}/${TOKENS_NEEDED.get(masteryChampion.championLevel)} tokens`;
				}
			}

			const champion: Champion = Champion.getChampionById(masteryChampion.championId);
			const info: ChampionInfo = {
				...masteryChampion,
				// Call the champion "New Champion" if static data ha not been updated yet
				championName: champion ? champion.name : `New Champion`,
				tooltip: tooltip,
				sortingValue: sortingValue,
				pointsToNextLevel: pointsToNextLevel
			};

			champions[i] = info;
		}

		res.status(200).render("summoner", {
			...COMMON_DATA,
			summoner: {
				icon: summoner.profileIconId,
				name: summoner.name,
				id: summoner.id,
				region: region.id
			},
			champions: champions,
			totals: {
				level: totalLevel,
				points: totalPoints,
				chests: totalChests,
				champions: champions.length
			}
		});

		interface ChampionInfo extends ChampionMasteryInfo {
			championName: string;
			tooltip: string;
			sortingValue: number;
			pointsToNextLevel: number;
		}
	} catch (ex) {
		if (ex instanceof RateLimitError) {
			renderError(res, 503, "Server overloaded", "Try again later. Retrying immediately will only make the problem worse.");
		} else if (ex instanceof apiHandler.APIError) {
			if (ex.statusCode === 404) {
				renderError(res, 404, "Player not found", "Make sure the summoner name and region are correct.");
			} else {
				renderError(res, 500, `API error (${ex.statusCode})`, "Try refreshing the page. If the problem persists, let me know (contact info in site footer).");
			}
		} else {
			console.error(VError.fullStack(new VError(ex, `Error creating page for summoner "${req.query.summoner}" (${req.query.region})`)));
			renderError(res, 500, "Unknown error", "Please send me a message (contact info in site footer).");
		}
	}
}

// A helper to generate the correct number of token icons
handlebars.registerHelper("getTokens", function() {
	let content: string = "";
	for (let i = 0; i < TOKENS_NEEDED.get(this.championLevel); i++) {
		content += `<img class="token${i >= this.tokensEarned ? " notEarned" : ""}" src="/img/token.png">`;
	}
	return content;
});
