import {COMMON_DATA, highscores} from "../server";
import {Highscore} from "../Highscores";
import Champion from "../Champion";
import express = require("express");

export function renderHighscores(req: express.Request, res: express.Response): void {
	// FIXME this whole response should really be cached.
	const champions: ChampionInfo[] = [];
	for (const champion of Champion.CHAMPIONS.values()) {
		const championInfo: ChampionInfo = {
			...champion,
			scores: highscores.highscoresSummary[champion.id]
		};
		champions.push(championInfo);
	}

	res.status(200).render("highscores", {
		...COMMON_DATA,
		highscores: champions
	});

	interface ChampionInfo extends Champion {
		scores: Highscore[];
	}
}
