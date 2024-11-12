import Region from "./Region";
import {renderPlayer} from "./routes/player";
import {renderChampion} from "./routes/champion";
import {renderHome} from "./routes/home";
import {redirectToRiotId} from "./routes/redirectToRiotId";
import Highscores from "./Highscores";
import Config from "./Config";
import * as staticDataUpdater from "./staticDataUpdater";
import express = require("express");
import path = require("path");
import VError = require("verror");
import * as React from "react";
import {getLocalization, Localization, SUPPORTED_LOCALES} from "./Localization";
import {renderFaq, renderLegalInfo, renderPrivacyInfo} from "./routes/staticPage";
import * as ReactDOMServer from "react-dom/server";
import Layout from "./components/Layout";
import ErrorPage from "./components/ErrorPage";


export let highscores: Highscores;

const app = express();

/**
 * Displays an error message.
 * @param res The Response to send the error to
 * @param code The HTTP status code to use
 * @param error A short summary of the error
 * @param details More info about the error (can be null)
 * @param localizedMessage A localized error message. If truthy, this will be used for the error summary, and the
 * unlocalized summary + details will be used as the details.
 */
export function renderError(req: express.Request, res: express.Response, code: number, error: string, details: string, localizedMessage: string): void {
	if (localizedMessage) {
		// Use unlocalized message as details since it contains more context than the localized summary.
		let unlocalizedMessage = error;
		if (details) {
			unlocalizedMessage += " - " + details;
		}

		error = localizedMessage;
		details = unlocalizedMessage;
	}

	const T: Localization = getLocalization(req);
	const commonData = getCommonData(req);
	const body = ReactDOMServer.renderToString(<Layout
		commonData={commonData}
		title={`ChampionMastery.GG - ${T["Error"]}`}
		description={`ChampionMastery.GG - ${T["Error"]}`}
		body={<ErrorPage error={error} details={details} commonData={commonData}/>}
		stylesheets={["/css/error.css"]}
		scripts={[]}
		preload={[]}
	/>);

	res.status(200).send(body);
}

/** Data that is used in every rendered view */
export type CommonData = {
	regions: string[],
	announcement: { message: string, link: string },
	siteUrl: string,
	dragonUrl: string,
	T: Localization,
	/** 2 character language code */
	langCode: string,
	supportedLocales: Localization[],
	currentUrl: string
};

/** Returns common data and localized translations. */
export function getCommonData(req: express.Request): CommonData {
	const localization = getLocalization(req);
	return {
		regions: Region.REGIONS.map((region) => region.id),
		announcement: Config.announcement,
		siteUrl: Config.siteUrl,
		dragonUrl: Config.publicDragonUrl,
		T: localization,
		langCode: localization.LOCALE_CODE.split("_")[0],
		supportedLocales: SUPPORTED_LOCALES,
		currentUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`
	};
}

async function start(): Promise<void> {
	console.log("Starting server...");

	try {
		await staticDataUpdater.updateStaticData();
	} catch (ex) {
		console.error(VError.fullStack(new VError(ex, "%s", "CRITICAL ERROR UPDATING STATIC DATA")));
		process.exit(1);
	}

	// Schedule static data updater
	setInterval(() => {
		staticDataUpdater.updateStaticData().catch((ex) => {
			console.error(VError.fullStack(new VError(ex, "%s", "Error updating static data (will continue using older version)")));
		});
	}, Config.staticDataUpdateInterval * 1000 * 60);

	highscores = new Highscores();

	app.use(express.static(path.join(__dirname, "..", "public")));
	app.get("/", renderHome);
	app.get("/faq", renderFaq);
	app.get("/legal", renderLegalInfo);
	app.get("/privacy", renderPrivacyInfo);
	app.get("/highscores", (req, res, next) => {
		res.redirect(301, "/");
		next();
	});
	app.get("/champion", renderChampion);
	app.get("/summoner", redirectToRiotId);
	app.get("/player", renderPlayer);
	app.get("/ads.txt", (req, res) => {
		res.status(200).send("google.com, pub-5598552437938145, DIRECT, f08c47fec0942fa0");
	});

	/*
	Prior to commit #9979aba3d0dbe9270fed023dec2b3e796b629645, there was a bug which would create links to pages such
	as the ones listed below, which were then picked up by Googlebot. Redirect them to existing pages so Googlebot
	stops crawling the bad URLs.

	/champiolang=de_DEn?champion=91
	/playelang=de_DEr?riotId=Derpthemeus%20%23DERP&region=NA
	/summonelang=de_DE?summoner=Derpthemeus&region=NA
	 */
	app.get("/champiolang*", (req: express.Request, res: express.Response) => {
		res.status(301).redirect("/");
	});
	app.get("/playelang*", (req: express.Request, res: express.Response) => {
		res.status(301).redirect("/");
	});
	app.get("/summonelang*", (req: express.Request, res: express.Response) => {
		res.status(301).redirect("/");
	});

	app.listen(Config.serverPort, Config.serverAddress);
	console.log("Server started");
}

start();
