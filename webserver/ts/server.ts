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
import http = require("http");
import https = require("https");
import handlebars = require("handlebars");
import expressHandlebars = require("express-handlebars");
import VError = require("verror");
import {getLocalization, Localization} from "./Localization";
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

	res.status(code).render("error", {
		...getCommonData(req),
		error: {
			error: error,
			details: details
		}
	});
}

/**
 * Sets up a page that doesn't use the express.Request object for anything, and only uses data from COMMON_DATA
 * @param pagePath The path of the page
 * @param view The name of the template to use
 */
function useStaticPage(pagePath: string, view: string): void {
	app.get(pagePath, (req, res) => {
		res.status(200).render(view, {
			...getCommonData(req)
		});
	});
}

/** Data that is used in every rendered view */
type CommonData = {
	regions: string[],
	announcement: { message: string, link: string },
	siteUrl: string,
	dragonUrl: string,
	T: Localization,
	/** 2 character language code */
	langCode: string
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
		langCode: localization.LOCALE_CODE.split("_")[0]
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

	const viewsPath: string = path.join(__dirname, "..", "views");
	app.engine("handlebars", expressHandlebars.create({
		defaultLayout: null
	}).engine);
	app.set("view engine", "handlebars");
	app.set("views", viewsPath);

	handlebars.registerPartial("layout", fs.readFileSync(path.join(viewsPath, "layout.handlebars"), "utf8"));

	app.use(express.static(path.join(__dirname, "..", "public")));
	app.get("/", renderHome);
	useStaticPage("/faq", "faq");
	useStaticPage("/legal", "legal");
	useStaticPage("/privacy", "privacy");
	app.get("/highscores", (req, res, next) => {
		// TODO change to 301.
		res.redirect(302,"/");
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
