import {getCommonData, highscores, renderError} from "../server";
import Champion from "../Champion";
import express = require("express");
import {Highscore} from "../apiHandler";
import * as ReactDOMServer from "react-dom/server";
import Layout from "../components/Layout";
import * as React from "react";
import ChampionPage from "../components/ChampionPage";
import {getLocalization, Localization} from "../Localization";

export function renderChampion(req: express.Request, res: express.Response): void {
	const championId: number = +req.query.champion;
	if (!championId) {
		renderError(req, res, 400, "No champion specified", null, null);
		return;
	}

	const champion: Champion = Champion.getChampionById(championId);
	if (!champion) {
		renderError(req, res, 404, "Champion not found", null, null);
		return;
	}

	const scores: Highscore[] = highscores.championHighscores.get(championId);

	const localization = getLocalization(req);
	const commonData = getCommonData(req);

	const body = ReactDOMServer.renderToString(<Layout
		commonData={commonData}
		title={localizeTitle(localization, champion)}
		description={localizeDescription(localization, champion)}
		body={<ChampionPage
			commonData={commonData}
			champion={champion}
			scores={scores}
		/>}
		stylesheets={["/css/champion.css"]}
		preload={[]}
	/>);

	res.status(200).send(body);
}

function localizeTitle(T: Localization, champion: Champion) {
	return `ChampionMastery.GG - ${T["League of Legends"]} ${champion.getLocalizedName(T)} ${T["champion mastery highscores"]}`;
}

function localizeDescription(T: Localization, champion: Champion) {
	return `${T["League of Legends"]} ${champion.getLocalizedName(T)} ${T["champion mastery highscores"]}`;
}
