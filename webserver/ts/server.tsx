import Region from "./Region";
import {renderSummoner} from "./routes/summoner";
import {renderChampion} from "./routes/champion";
import {renderHome} from "./routes/home";
import Highscores from "./Highscores";
import Config from "./Config";
import * as staticDataUpdater from "./staticDataUpdater";
import express = require("express");
import fs = require("fs");
import path = require("path");
import handlebars = require("handlebars");
import expressHandlebars = require("express-handlebars");
import VError = require("verror");
import * as React from "react";
import {getLocalization, Localization, SUPPORTED_LOCALES} from "./Localization";
import {renderFaq, renderLegalInfo, renderPrivacyInfo} from "./routes/staticPage";
import * as ReactDOMServer from "react-dom/server";
import Layout from "./components/Layout";
import ErrorPage from "./components/ErrorPage";

const layouts = require("handlebars-layouts");
const helpers = require("handlebars-helpers");


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

	layouts.register(handlebars);

	// gte, eq
	helpers.comparison();
	// TODO localize ordinalization
	// ordinalize
	helpers.inflection();
	// lowercase
	helpers.string();
	// add
	helpers.math();
	// encodeURI
	helpers.url();

	// A helper to generate the hreflang attribute in alternate links
	handlebars.registerHelper("hreflang", function (currentUrl: string) {
		let href: string;
		// This will need to be changed if another query parameter with a *lang suffix is ever added.
		if (currentUrl.includes("lang=")) {
			const startIndex = currentUrl.indexOf("lang=");
			// End of "lang=en_US"
			let endIndex;
			if (currentUrl.indexOf("&", startIndex) > 0) {
				endIndex = currentUrl.indexOf("&", startIndex);
			} else {
				endIndex = currentUrl.length;
			}

			href = `${currentUrl.slice(0, startIndex)}lang=${this.LOCALE_CODE}${currentUrl.slice(endIndex)}`;
		} else if (currentUrl.includes("?")) {
			// If query params are already present, add the new param to the start of the list.
			const index = currentUrl.indexOf("?") - 1;
			href = `${currentUrl.slice(0, index)}lang=${this.LOCALE_CODE}${currentUrl.slice(index)}`;
		} else {
			// Just add query to end of path
			href = `${currentUrl}?lang=${this.LOCALE_CODE}`;
		}
		return `<link rel="alternate" hreflang="${this.LOCALE_CODE.split("_")[0]}" href="${href}" />`;
	});

	const viewsPath: string = path.join(__dirname, "..", "views");
	app.engine("handlebars", expressHandlebars.create({
		defaultLayout: null
	}).engine);
	app.set("view engine", "handlebars");
	app.set("views", viewsPath);

	handlebars.registerPartial("layout", fs.readFileSync(path.join(viewsPath, "layout.handlebars"), "utf8"));

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
	app.get("/summoner", renderSummoner);
	app.get("/ads.txt", (req, res) => {
		res.status(200).send("google.com, pub-5598552437938145, DIRECT, f08c47fec0942fa0");
	});

	app.listen(Config.serverPort, Config.serverAddress);
	console.log("Server started");
}

start();
