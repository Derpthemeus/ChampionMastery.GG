import {getCommonData, highscores} from "../server";
import {Highscore} from "../Highscores";
import Champion from "../Champion";
import express = require("express");

export function renderHome(req: express.Request, res: express.Response): void {
	// FIXME this whole response should really be cached.
	const champions: ChampionInfo[] = [];
	for (const champion of Champion.CHAMPIONS.values()) {
		const championInfo: ChampionInfo = {
			...champion,
			scores: highscores.highscoresSummary[champion.id]
		};
		champions.push(championInfo);
	}

	res.status(200).render("home", {
		...getCommonData(req),
		highscores: champions
	});

	interface ChampionInfo extends Champion {
		scores: Highscore[];
	}
}
