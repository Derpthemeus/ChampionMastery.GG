import {COMMON_DATA, highscores, renderError} from "../server";
import {Highscore} from "../types";
import Champion from "../Champion";
import Config from "../Config";
import express = require("express");

export function renderChampion(req: express.Request, res: express.Response): void {
	const championId: number = +req.query.champion;
	if (!championId) {
		renderError(res, 400, "No champion specified");
		return;
	}

	const champion: Champion = Champion.getChampionById(championId);
	if (!champion) {
		renderError(res, 404, "Champion not found");
		return;
	}

	const scores: Highscore[] = new Array(Config.highscoreCount.display);
	for (let i = 0; i < Config.highscoreCount.display; i++) {
		scores[i] = highscores.getHighscore(champion.id, i);
	}

	res.status(200).render("champion", {
		...COMMON_DATA,
		champion: champion,
		scores: scores
	});
}
