import Region from "./Region";
import {renderSummoner} from "./routes/summoner";
import {renderChampion} from "./routes/champion";
import {renderHighscores} from "./routes/highscores";
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
const layouts = require("handlebars-layouts");
const helpers = require("handlebars-helpers");

/** Data that is used in every rendered view */
export const COMMON_DATA: { regions: string[], announcement: { message: string, link: string }, siteUrl: string } = {
	regions: Region.REGIONS.map((region) => region.id),
	announcement: Config.announcement,
	siteUrl: Config.siteUrl
};

export let highscores: Highscores;

const app = express();

/**
 * Displays an error message.
 * @param res The Response to send the error to
 * @param code The HTTP status code to use
 * @param error A short summary of the error
 * @param details More info about the error (optional)
 */
export function renderError(res: express.Response, code: number, error: string, details?: string): void {
	res.status(code).render("error", {
		...COMMON_DATA,
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
			...COMMON_DATA
		});
	});
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
	app.use("/img", express.static(staticDataUpdater.imagesPath));
	useStaticPage("/", "home");
	useStaticPage("/faq", "faq");
	useStaticPage("/legal", "legal");
	useStaticPage("/privacy", "privacy");
	app.get("/highscores", renderHighscores);
	app.get("/champion", renderChampion);
	app.get("/summoner", renderSummoner);
	app.get("/ads.txt", (req, res) => {
		https.get("https://adstxt.venatusmedia.com/master_ads.txt", (upstreamRes: http.IncomingMessage) => {
			upstreamRes.pipe(res, {end: false});
			upstreamRes.on("end", () => {
				res.write("\ngoogle.com, pub-5598552437938145, DIRECT, f08c47fec0942fa0");
				res.end();
			});
		});
	});

	app.listen(Config.serverPort, Config.serverAddress);
	console.log("Server started");
}

start();
