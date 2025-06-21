import {getCommonData, highscores} from "../server";
import Champion from "../Champion";
import express = require("express");
import {getLocalization} from "../Localization";
import * as ReactDOMServer from "react-dom/server";
import Layout from "../components/Layout";
import * as React from "react";
import HomePage, {ChampionHighscoreSummary} from "../components/HomePage";

export async function renderHome(req: express.Request, res: express.Response): Promise<void> {
	const localization = getLocalization(req);

	// FIXME this whole response should really be cached (1 copy per locale).
	const champions: ChampionHighscoreSummary[] = [];
	for (const champion of Champion.CHAMPIONS.values()) {
		const championInfo: ChampionHighscoreSummary = {
			...champion,
			localizedName: champion.getLocalizedName(localization),
			scores: highscores.highscoresSummary[champion.id] || []
		};
		champions.push(championInfo);
	}

	champions.sort((a, b) => {
		if (a.id > 0 && b.id > 0) {
			return (a.localizedName.toUpperCase() < b.localizedName.toUpperCase()) ? -1 : 1;
		} else if (a.id < 0 && b.id < 0) {
			return a.id > b.id ? -1 : 1;
		} else if (a.id < 0) {
			return -1;
		} else {
			return 1;
		}
	});

	const commonData = getCommonData(req);

	const body = ReactDOMServer.renderToString(<Layout
		commonData={commonData}
		title={`ChampionMastery.GG - ${localization["League of Legends"]} ${localization["champion mastery highscores"]} ${localization["and player lookup"]}`}
		description={`${localization["League of Legends"]} ${localization["champion mastery highscores"]} ${localization["and player lookup"]}`}
		body={<HomePage
			commonData={commonData}
			champions={champions}
		/>}
		stylesheets={["/css/home.css"]}
		scripts={["/js/home.js"]}
		preload={[`${commonData.dragonUrl}/img/championSpritesheet.webp`]}
	/>);

	res.status(200).send(body);
}
