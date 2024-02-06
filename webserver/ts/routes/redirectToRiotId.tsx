import Region from "../Region";
import * as apiHandler from "../apiHandler";
import {PlayerInfo} from "../apiHandler";
import {renderError} from "../server";
import express = require("express");
import VError = require("verror");
import {getLocalization} from "../Localization";

export async function redirectToRiotId(req: express.Request, res: express.Response): Promise<void> {
	if (!req.query.summoner || typeof req.query.summoner !== "string") {
		renderError(req, res, 400, "No summoner name specified", null, null);
		return;
	}

	if (!req.query.region || typeof req.query.region !== "string") {
		renderError(req, res, 400, "No region specified", null, null);
		return;
	}

	const localization = getLocalization(req);
	const localize = localization.LOCALE_CODE !== "en_US";
	const checkSummonerNameMessage = localize ? localization["Summoner X not found in region Y"]
			.replace("%summoner%", req.query.summoner)
			.replace("%region%", req.query.region)
		: null;
	const tryAgainLaterMessage = localize ? localization["Double check the summoner name and region, then try again later"] : null;

	const region: Region = Region.getByRegionId(req.query.region.toUpperCase());
	if (!region) {
		renderError(req, res, 400, "Invalid region", null, null);
		return;
	}

	try {
		const player: PlayerInfo = await apiHandler.getRiotId(region, req.query.summoner);
		const riotId = `${player.gameName}#${player.tagLine}`;
		let redirectUrl = `/player?riotId=${encodeURIComponent(riotId)}&region=${region.id}`;
		if (req.query.lang) {
			redirectUrl += `&lang=${req.query.lang}`;
		}
		// FIXME change to 301.
		res.status(302).redirect(redirectUrl);
	} catch (ex) {
		if (ex instanceof apiHandler.APIError) {
			if (ex.statusCode === 429) {
				renderError(req, res, 503, "Server overloaded", "Try again later. Retrying immediately will only make the problem worse.", tryAgainLaterMessage);
			} else if (ex.statusCode === 404) {
				renderError(req, res, 404, "Player not found", "Make sure the summoner name and region are correct.", checkSummonerNameMessage);
			} else {
				renderError(req, res, 500, `API error (${ex.statusCode})`, "Try refreshing the page. If the problem persists, let me know (contact info in Help & Info on site footer).", tryAgainLaterMessage);
			}
		} else {
			console.error(VError.fullStack(new VError(ex, "%s", `Error redirecting for summoner "${req.query.summoner}" (${req.query.region})`)));
			renderError(req, res, 500, "Unknown error", "Please send me a message (contact info in Help & Info in site footer).", tryAgainLaterMessage);
		}
	}
}
