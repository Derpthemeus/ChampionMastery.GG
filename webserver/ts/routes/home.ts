import {getCommonData, highscores} from "../server";
import Champion from "../Champion";
import express = require("express");
import {getLocalization} from "../Localization";

export function renderHome(req: express.Request, res: express.Response): void {
	const localization = getLocalization(req);

	// FIXME this whole response should really be cached (1 copy per locale).
	const champions = [];
	for (const champion of Champion.CHAMPIONS.values()) {
		const championInfo = {
			...champion,
			localizedName: champion.getLocalizedName(localization),
			scores: highscores.highscoresSummary[champion.id]
		};
		champions.push(championInfo);
	}

	champions.sort((a, b) => {
		if (a.id > 0 && b.id > 0) {
			return (a.localizedName.toUpperCase() < b.localizedName.toUpperCase()) ? -1 : 1;
		} if (a.id < 0 && b.id < 0) {
			return a.id > b.id ? -1 : 1;
		} else if (a.id < 0) {
			return -1;
		} else {
			return 1;
		}
	});

	res.status(200).render("home", {
		...getCommonData(req),
		highscores: champions
	});
}
