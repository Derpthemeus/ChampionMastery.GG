import {COMMON_DATA, highscores} from "../server";
import {Highscore} from "../types";
import Champion from "../Champion";
import express = require("express");

export function renderHighscores(req: express.Request, res: express.Response): void {
	const champions: ChampionInfo[] = [];
	for (const champion of Champion.CHAMPIONS.values()) {
		const championInfo: ChampionInfo = {
			...champion,
			scores: new Array(3)
		};
		for (let i = 0; i < 3; i++) {
			const score: Highscore = highscores.getHighscore(champion.id, i);
			championInfo.scores[i] = score;
		}
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
