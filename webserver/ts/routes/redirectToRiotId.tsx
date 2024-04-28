import Region from "../Region";
import {renderError} from "../server";
import express = require("express");

export async function redirectToRiotId(req: express.Request, res: express.Response): Promise<void> {
	if (!req.query.summoner || typeof req.query.summoner !== "string") {
		renderError(req, res, 400, "No summoner name specified", null, null);
		return;
	}

	if (!req.query.region || typeof req.query.region !== "string") {
		renderError(req, res, 400, "No region specified", null, null);
		return;
	}

	const region: Region = Region.getByRegionId(req.query.region.toUpperCase());
	if (!region) {
		renderError(req, res, 400, "Invalid region", null, null);
		return;
	}

	const riotId = `${req.query.summoner}#${region.platformId}`;
	let redirectUrl = `/player?riotId=${encodeURIComponent(riotId)}&region=${region.id}`;
	if (req.query.lang) {
		redirectUrl += `&lang=${req.query.lang}`;
	}
	res.status(301).redirect(redirectUrl);
}
