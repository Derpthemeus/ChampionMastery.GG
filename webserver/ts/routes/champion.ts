import {getCommonData, highscores, renderError} from "../server";
import {Highscore} from "../Highscores";
import Champion from "../Champion";
import express = require("express");
import {getLocalization} from "../Localization";

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
	res.status(200).render("champion", {
		...getCommonData(req),
		champion: champion,
		localizedChampionName: champion.getLocalizedName(localization),
		scores: scores
	});
}
