import {getCommonData, highscores, renderError} from "../server";
import {Highscore} from "../Highscores";
import Champion from "../Champion";
import express = require("express");

export function renderChampion(req: express.Request, res: express.Response): void {
	const championId: number = +req.query.champion;
	if (!championId) {
		renderError(req, res, 400, "No champion specified");
		return;
	}

	const champion: Champion = Champion.getChampionById(championId);
	if (!champion) {
		renderError(req, res, 404, "Champion not found");
		return;
	}

	const scores: Highscore[] = highscores.championHighscores.get(championId);

	res.status(200).render("champion", {
		...getCommonData(req),
		champion: champion,
		scores: scores
	});
}
