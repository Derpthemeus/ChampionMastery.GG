import Region from "../Region";
import * as apiHandler from "../apiHandler";
import {ChampionMasteryResponse, SummonerInfo} from "../apiHandler";
import {getCommonData, renderError} from "../server";
import Champion from "../Champion";
import express = require("express");
import XRegExp = require("xregexp");
import VError = require("verror");
import {getLocalization, Localization} from "../Localization";
import * as ReactDOMServer from "react-dom/server";
import Layout from "../components/Layout";
import * as React from "react";
import SummonerPage from "../components/SummonerPage";

const RIOT_ID_REGEX = XRegExp("^.+#.+$");
/** How many tokens are needed to continue from a level (the key) to the next */
const TOKENS_NEEDED = new Map([[5, 2], [6, 3]]);

export async function renderPlayer(req: express.Request, res: express.Response): Promise<void> {
	if (!req.query.riotId || typeof req.query.riotId !== "string") {
		renderError(req, res, 400, "No Riot ID specified", null, null);
		return;
	}

	if (!req.query.region || typeof req.query.region !== "string") {
		renderError(req, res, 400, "No region specified", null, null);
		return;
	}

	const localization = getLocalization(req);
	const localize = localization.LOCALE_CODE !== "en_US";
	const checkRiotIdMessage = localize ? localization["Double check the Riot ID and region, then try again later"] : null;
	const tryAgainLaterMessage = localize ? localization["Try again later"] : null;

	const region: Region = Region.getByRegionId(req.query.region.toUpperCase());
	if (!region) {
		renderError(req, res, 400, "Invalid region", null, null);
		return;
	}

	if (!RIOT_ID_REGEX.test(req.query.riotId)) {
		renderError(req, res, 400, "Invalid Riot ID", "Name must include the display name and tag", checkRiotIdMessage);
		return;
	}

	try {
		const summoner: SummonerInfo = await apiHandler.getSummonerInfo(region, req.query.riotId);
		const masteries: ChampionMasteryResponse[] = summoner.scores;
		const champions: ChampionInfo[] = new Array(masteries.length);

		let totalLevel: number = 0, totalPoints: number = 0, totalChests: number = 0;
		for (let i = 0; i < masteries.length; i++) {
			const masteryChampion: ChampionMasteryResponse = masteries[i];

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
				tooltip = `${masteryChampion.championPointsSinceLastLevel}/${masteryChampion.championPointsSinceLastLevel + masteryChampion.championPointsUntilNextLevel} ${localization["Points"]} (${sortingValue}%)`;
				pointsToNextLevel = masteryChampion.championPointsUntilNextLevel;
			} else {
				sortingValue = (100 * masteryChampion.championLevel) + masteryChampion.tokensEarned;
				// Using a higher value to keep lvl 5 and above at the end of the ascending sort
				pointsToNextLevel = 90000 + (100 * masteryChampion.championLevel);

				if (masteryChampion.championLevel === 7) {
					tooltip = localization["Mastered"];
				} else {
					tooltip = `${masteryChampion.tokensEarned}/${TOKENS_NEEDED.get(masteryChampion.championLevel)} ${localization["tokens"]}`;
				}
			}

			const champion: Champion = Champion.getChampionById(masteryChampion.championId);
			const info: ChampionInfo = {
				...masteryChampion,
				// Call the champion "???" if static data ha not been updated yet
				localizedChampionName: champion ? champion.getLocalizedName(localization) : "???",
				tooltip: tooltip,
				sortingValue: sortingValue,
				pointsToNextLevel: pointsToNextLevel
			};

			champions[i] = info;
		}

		const totals = {
			level: totalLevel,
			points: totalPoints,
			chests: totalChests,
			champions: champions.length
		};

		const commonData = getCommonData(req);

		const body = ReactDOMServer.renderToString(<Layout
			commonData={commonData}
			title={localizeTitle(localization, summoner, region)}
			description={localizeDescription(localization, summoner, region)}
			body={<SummonerPage
				commonData={commonData}
				region={region}
				summoner={summoner}
				champions={champions}
				totals={totals}
			/>}
			stylesheets={["/css/summoner.css"]}
			scripts={["/js/summoner.js", "/js/rgea.js"]}
		/>);

		res.status(200).send(body);


	} catch (ex) {
		if (ex instanceof apiHandler.APIError) {
			if (ex.statusCode === 429) {
				renderError(req, res, 503, "Server overloaded", "Try again later. Retrying immediately will only make the problem worse.", tryAgainLaterMessage);
			} else if (ex.statusCode === 404) {
				renderError(req, res, 404, "Player not found", "Double check the Riot ID and region, then try again later", checkRiotIdMessage);
			} else {
				renderError(req, res, 500, `API error (${ex.statusCode})`, "Try refreshing the page. If the problem persists, let me know (contact info in Help & Info on site footer).", tryAgainLaterMessage);
			}
		} else {
			console.error(VError.fullStack(new VError(ex, "%s", `Error creating page for player "${req.query.riotId}" (${req.query.region})`)));
			renderError(req, res, 500, "Unknown error", "Please send me a message (contact info in Help & Info in site footer).", tryAgainLaterMessage);
		}
	}
}

function localizeTitle (T: Localization, summoner: SummonerInfo, region: Region) {
	return `ChampionMastery.GG - ${T["League of Legends"]} ${T["champion mastery scores for X"]}`
		.replace("%name%", `${summoner.name} (${region.id})`);
}

function localizeDescription(T: Localization, summoner: SummonerInfo, region: Region) {
	return `${T["League of Legends"]} ${T["champion mastery scores for X"]}`
		.replace("%name%", `${summoner.name} (${region.id})`);
}

export interface ChampionInfo extends ChampionMasteryResponse {
	localizedChampionName: string;
	tooltip: string;
	sortingValue: number;
	pointsToNextLevel: number;
}
