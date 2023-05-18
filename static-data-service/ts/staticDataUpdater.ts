import Champion from "./Champion";
import Config from "./Config";
import fs = require("fs");
import http = require("http");
import https = require("https");
import path = require("path");
import stream = require("stream");
import VError = require("verror");
import mkdirp = require("mkdirp");
import XRegExp = require("xregexp");
import sharp = require("sharp");
import {OverlayOptions} from "sharp";

const gunzip = require("gunzip-maybe");
const tar = require("tar-stream");

/** The directory where public images are stored */
export const imagesPath: string = path.join(Config.staticDataPath, "icons");
/** The directory where champion icons are stored */
const championIconsPath: string = path.join(imagesPath, "championIcons");
/** The directory where profile icons are stored */
const profileIconsPath: string = path.join(imagesPath, "profileIcons");
/** The file where the champion list is saved */
const championListPath: string = path.join(Config.staticDataPath, "en_US", "champion.json");
/** The path of a text file containing the DDragon version of the currently downloaded data */
const ddragonVersionPath: string = path.join(Config.staticDataPath, "ddragonVersion.txt");
const supportedLocales = ["en_US", "vi_VN", "ko_KR", "zh_TW"];
/** The DDragon version of the currently downloaded static data */
let currentDDragonVersion: string;

/**
 * Updates the current DDragon version, champion list, and icons to the latest version.
 * Does nothing if everything is already up to date.
 * @async
 * @throws {Error} Thrown if an error occurs while updating data. If this happens, some static data may be updated and
 * other parts will continue using old data (if an older version of the data was already downloaded).
 */
export const updateStaticData = async (): Promise<void> => {
	return new Promise<void>(async (resolve: Function, reject: Function) => {
		console.log("Updating static data...");
		// Create the static data directory (if it doesn't already exist)
		try {
			if (!fs.existsSync(Config.staticDataPath)) {
				mkdirp.sync(Config.staticDataPath);
				console.log("Created static data directory");
			}
		} catch (ex) {
			reject(new VError(ex, "%s", `Unable to create static data directory ${Config.staticDataPath}`));
			return;
		}
		// Determine the DDragon version of the currently downloaded static data (if it hasn't already been determined)
		if (!currentDDragonVersion) {
			try {
				if (fs.existsSync(ddragonVersionPath)) {
					currentDDragonVersion = fs.readFileSync(ddragonVersionPath, "utf8");
				}
			} catch (ex) {
				// This error isn't critical (static data will just be redownloaded, even if it isn't necessary), so it's just logged instead of thrown
				console.error(VError.fullStack(new VError(ex, "%s", `Error loading DDragon version from ${ddragonVersionPath}`)));
			}
		}
		/** The latest published DDragon version */
		let latestVersion: string;
		try {
			latestVersion = await getLatestDDragonVersion();
		} catch (ex) {
			// Continue using the currently downloaded version (if it exists) if there is an error getting the latest version
			if (currentDDragonVersion) {
				latestVersion = currentDDragonVersion;
				console.error(VError.fullStack(new VError(ex, "%s", "Error getting latest DDragon version, will continue to user currently downloaded version")));
			} else {
				reject(new VError(ex, "%s", "Error getting latest DDragon version"));
				return;
			}
		}

		if (!currentDDragonVersion || latestVersion !== currentDDragonVersion) {
			try {
				await downloadData(latestVersion);

				currentDDragonVersion = latestVersion;
				// Save the latest DDragon version to ddragonVersion.txt
				try {
					fs.writeFileSync(ddragonVersionPath, latestVersion, "utf8");
				} catch (ex) {
					// This error isn't critical, so it's just logged instead of thrown
					console.error(VError.fullStack(new VError(ex, "%s", "Error saving latest DDragon version")));
				}

				console.log("Updated static data. Latest version: " + currentDDragonVersion);
			} catch (ex) {
				reject(new VError(ex, "%s", "Error updating static data"));
				return;
			}
		} else {
			// Champions still need to be loaded when the server starts
			if (!Champion.CHAMPIONS) {
				updateChampions();
			}
			console.log("Static data is already up to date");
		}

		await createChampionSpriteSheet();

		resolve();
	});
};

/**
 * Downloads the latest dragontail archive and extracts profile icons, champion icons, and the champion list
 * @param ddragonVersion The latest DDragon version (e.g. "7.14.1")
 * @async
 * @throws {Error} Thrown if an error occurs while downloading or extracting static data
 */
const downloadData = (ddragonVersion: string): Promise<void> => {
	return new Promise<void>((resolve: Function, reject: Function) => {
		console.log("Downloading static data...");
		try {
			if (!fs.existsSync(championIconsPath)) {
				mkdirp.sync(championIconsPath);
			}
			if (!fs.existsSync(profileIconsPath)) {
				mkdirp.sync(profileIconsPath);
			}

			// Create directory for each locale
			for (const locale of supportedLocales) {
				const localePath = path.join(Config.staticDataPath, locale);
				if (!fs.existsSync(localePath)) {
					mkdirp.sync(localePath);
				}
			}
		} catch (ex) {
			reject(new VError(ex, "%s", "Unable to create directories"));
			return;
		}

		const url: string = `https://ddragon.leagueoflegends.com/cdn/dragontail-${ddragonVersion}.tgz`;
		https.get(url, (response: http.IncomingMessage) => {
			if (response.statusCode === 200) {
				/** A promise for each file that needs to be saved. Each promise will be resolved when the file has been saved, or rejected if an error occurs */
				const promises: Promise<void>[] = [];

				const tarStream = tar.extract();
				tarStream.on("error", (err: Error) => {
					reject(new VError(err, "%s", "Error reading tarball stream"));
				});

				const championJsonRegex = XRegExp(`^(.\\/)?${XRegExp.escape(ddragonVersion)}\\/data\\/(?<locale>.+)\\/champion\\.json$`);
				const profileIconRegex = XRegExp(`^(.\\/)?${XRegExp.escape(ddragonVersion)}\\/img\\/profileicon\\/.+[^\\/]$`);
				const championIconRegex = XRegExp(`^(.\\/)?${XRegExp.escape(ddragonVersion)}\\/img\\/champion\\/.+[^\\/]$`);

				let entriesChecked: number = 0;
				tarStream.on("entry", (header: { name: string }, entryStream: stream.Readable, next: Function) => {
					if (++entriesChecked % 1000 === 0) {
						console.log(`Checked ${entriesChecked} entries in the tarball...`);
					}
					if (profileIconRegex.test(header.name)) {
						const promise: Promise<void> = saveEntry(entryStream, profileIconsPath, header.name);
						// This is needed to suppress an UnhandledPromiseRejectionWarning (the rejection will actually be handled later by Promise.all())
						promise.catch(() => {});
						promises.push(promise);
					} else if (championIconRegex.test(header.name)) {
						const promise: Promise<void> = saveEntry(entryStream, championIconsPath, header.name);
						// This is needed to suppress an UnhandledPromiseRejectionWarning (the rejection will actually be handled later by Promise.all())
						promise.catch(() => { });
						promises.push(promise);
					} else if (championJsonRegex.test(header.name)) {
						const locale = XRegExp.exec(header.name, championJsonRegex).groups.locale;
						if (supportedLocales.includes(locale)) {
							const promise: Promise<void> = saveEntry(entryStream, path.join(Config.staticDataPath, locale), header.name);
							// This is needed to suppress an UnhandledPromiseRejectionWarning (the rejection will actually be handled later by Promise.all())
							promise.catch(() => { });
							promises.push(promise);
						} else {
							entryStream.resume();
						}
					} else {
						/* "The tar archive is streamed sequentially, meaning you must drain each entry's stream as
						you get them or else the main extract stream will receive backpressure and stop reading."
						- https://github.com/mafintosh/tar-stream/blob/master/README.md */
						entryStream.resume();
					}
					next();
				});
				tarStream.on("finish", () => {
					console.log(`Finished checking tarball, waiting for ${promises.length} files to finish saving...`);
					Promise.all(promises).then(() => {
						console.log("All files finished saving");
						updateChampions();
						resolve();
					}, (err) => {
						reject(new VError(err, "%s", "Error updating static data"));
					});
				});

				const gunzipStream = gunzip();
				gunzipStream.on("error", (err: Error) => {
					reject(new VError(err, "%s", "Error gunzipping stream"));
				});

				response.pipe(gunzipStream).pipe(tarStream);

				/**
				 * Saves an entry from the .tar.gz archive to a file. The filename is the same as the name of entry in the archive.
				 * @param entryStream A stream of the entry to save
				 * @param saveDirectory The directory to save the file in
				 * @param originalPath The path of the entry inside the archive. The filename of the saved file is the same as in this.
				 */
				function saveEntry(entryStream: stream.Readable, saveDirectory: string, originalPath: string): Promise<void> {
					return new Promise<void>((resolve_entry: Function, reject_entry: Function) => {
						const split: string[] = originalPath.split("/");
						/** The filename of the entry in the archive (and of the saved file) */
						const filename: string = split[split.length - 1];
						/** The path to save the file to */
						const savePath: string = path.join(saveDirectory, filename);
						const writeStream: fs.WriteStream = fs.createWriteStream(savePath);
						writeStream.on("error", (err: Error) => {
							// The stream needs to be drained to prevent the main TAR stream from receiving backpressure
							entryStream.resume();
							writeStream.close();
							reject_entry(new VError(err, "%s", `Error saving file to ${savePath}`));
						});
						writeStream.on("finish", () => {
							resolve_entry();
						});
						entryStream.pipe(writeStream);
					});
				}
			} else {
				reject(new VError("%s", `Received ${response.statusCode} code for ${url}`));
			}
		}).on("error", (err: Error) => {
			reject(new VError(err, "%s", `Error accessing ${url}`));
		});
	});
};

/**
 * Uses the saved champion.json file to updates the champion list and highscores
 */
const updateChampions = () => {
	let championList: ChampionList;
	try {
		const championListString: string = fs.readFileSync(championListPath, "utf8");
		championList = JSON.parse(championListString);
	} catch (ex) {
		throw new VError(ex, "%s", "Error loading champion list");
	}

	/** Champions mapped to their ID (unsorted) */
	const champions: Map<number, Champion> = new Map<number, Champion>();
	for (const key of Object.keys(championList.data)) {
		const champion: ChampionListEntry = championList.data[key];
		champions.set(+champion.key, {
			id: +champion.key,
			unlocalizedName: champion.name,
			localizedNames: {},
			icon: champion.image.full
		});
	}

	// Translate champion names.
	const totalPointsLocalizations: { [locale: string]: string } = {};
	const totalLevelLocalizations: { [locale: string]: string } = {};
	for (const locale of supportedLocales) {
		let localizedChampionList;
		try {
			const localizedChampionListString = fs.readFileSync(path.join(Config.staticDataPath, locale, "champion.json"), "utf-8");
			localizedChampionList = JSON.parse(localizedChampionListString);
		} catch (ex) {
			throw new VError(ex, "Error loading %s champion list", locale);
		}

		for (const key of Object.keys(localizedChampionList.data)) {
			const champion: ChampionListEntry = localizedChampionList.data[key];
			champions.get(+champion.key).localizedNames[locale] = champion.name;
		}

		let localization;
		try {
			const localizationString = fs.readFileSync(path.join(__dirname, "..", "locales", `${locale}.json`), "utf-8");
			localization = JSON.parse(localizationString);
		} catch (ex) {
			throw new VError(ex, "Error loading localization for %s", locale);
		}
		totalPointsLocalizations[locale] = localization["Total points"];
		totalLevelLocalizations[locale] = localization["Total level"];
	}

	champions.set(-1, {
		id: -1,
		unlocalizedName: "Total Points",
		localizedNames: totalPointsLocalizations,
		// This is relative to the championIcons directory
		icon: "../masteryIcon.png"
	});
	champions.set(-2, {
		id: -2,
		unlocalizedName: "Total Level",
		localizedNames: totalLevelLocalizations,
		// This is relative to the championIcons directory
		icon: "../masteryIcon.png"
	});

	// Add spongecase localizations.
	for (const champion of champions.values()) {
		let localizedName = "";
		for (let i = 0; i < champion.unlocalizedName.length; i++) {
			localizedName += (i % 2 === 0) ? champion.unlocalizedName[i].toLowerCase() : champion.unlocalizedName[i].toUpperCase();
		}
		champion.localizedNames["sponge"] = localizedName;
	}

	Champion.CHAMPIONS = champions;

	console.log(`Updated champion list with ${Champion.CHAMPIONS.size} champions`);
};

const getLatestDDragonVersion = (): Promise<string> => {
	return new Promise<string>((resolve: Function, reject: Function) => {
		https.get("https://ddragon.leagueoflegends.com/api/versions.json", (response: http.IncomingMessage) => {
			let body: string = "";
			response.on("data", (segment) => {
				body += segment;
			});

			response.on("error", (err: Error) => {
				reject(new VError(err, "%s", `Error getting DDragon version list`));
			});

			response.on("end", () => {
				if (response.statusCode === 200) {
					const versions: string[] = JSON.parse(body);
					resolve(versions[0]);
				} else {
					reject(new VError("%s", `Received a ${response.statusCode} status code when accessing DDragon version list`));
				}
			});
		}).on("error", (err: Error) => {
			reject(new VError(err, "%s", `Error getting DDragon version list`));
		});
	});
};

const createChampionSpriteSheet = async () => {
	console.log("Creating champion icon spritesheet...");
	const tileSize: number = 80;
	const champions = Array.from(Champion.CHAMPIONS.values());
	const spritesheet: sharp.Sharp = sharp({
		create: {
			width: tileSize,
			height: tileSize * champions.length,
			channels: 4,
			background: {r: 0, g: 0, b: 0, alpha: 0}
		}
	}).png();

	const images: OverlayOptions[] = new Array(champions.length);
	for (let i = 0; i < champions.length; i++) {
		const champion = champions[i];

		let imagePath: string;
		if (champion.id <= 0) {
			imagePath = path.join(__dirname, "..", "static", "masteryIcon.png");
		} else {
			imagePath = path.join(championIconsPath, champion.icon);
		}
		const buffer: Buffer = await sharp(imagePath).resize(tileSize).toBuffer();


		champion.spritesheetY = i * tileSize;

		images[i] = {
			input: buffer,
			top: champion.spritesheetY,
			left: 0
		};
	}

	spritesheet.composite(images);
	await spritesheet.toFile(path.join(imagesPath, "championSpritesheet.png"));
	console.log("Saved champion icon spritesheet");
};

/**
 * The format of DDragon's champion.json
 */
interface ChampionList {
	data: {
		[id: string]: ChampionListEntry
	};
}

/**
 * An entry for a single champion in DDragon's champion.json
 */
interface ChampionListEntry {
	name: string;
	key: number;
	image: {
		/** The filename of the icon (e.g. "Annie.png") */
		full: string
	};
}
