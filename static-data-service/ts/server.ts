import Config from "./Config";
import * as staticDataUpdater from "./staticDataUpdater";
import express = require("express");
import path = require("path");
import VError = require("verror");
import Champion from "./Champion";

const app = express();

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

	app.use("/img", express.static(staticDataUpdater.imagesPath));
	app.use("/img", express.static(path.join(__dirname, "..", "static")));

	app.use("/getChampions", (req, res) => res.status(200).json(
		[...Champion.CHAMPIONS]
	));

	app.listen(Config.serverPort, Config.serverAddress);
	console.log("Server started");
}

start();
