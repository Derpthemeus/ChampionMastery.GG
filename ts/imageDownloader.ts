import fs = require("fs");
import http = require("http");
import https = require("https");
import path = require("path");
import stream = require("stream");
import VError = require("verror");
const gunzip = require("gunzip-maybe");
const tar = require("tar-stream");

/** The directory where public images are stored */
const imagesPath: string = path.join(__dirname, "..", "public", "img");
/** The directory where champion icons are stored */
export const championIconsPath: string = path.join(imagesPath, "championIcons");
/** The directory where profile icons are stored */
export const profileIconsPath: string = path.join(imagesPath, "profileIcons");

/**
 * Downloads profile icons and champion icons for the latest DDragon version
 * @param ddragonVersion The latest DDragon version (e.g. "7.14.1")
 * @async
 * @throws {Error} Thrown if an error occurs while downloading the images
 */
export const downloadImages = (ddragonVersion: string): Promise<void> => {
	return new Promise<void>((resolve: Function, reject: Function) => {
		console.log("Downloading images...");
		if (!fs.existsSync(championIconsPath)) {
			fs.mkdirSync(championIconsPath);
		}
		if (!fs.existsSync(profileIconsPath)) {
			fs.mkdirSync(profileIconsPath);
		}

		const url: string = `https://ddragon.leagueoflegends.com/cdn/dragontail-${ddragonVersion}.tgz`;
		https.get(url, (response: http.IncomingMessage) => {
			if (response.statusCode === 200) {
				/** A promise for each image that will be resolved when it has been saved, or rejected if an error occurs */
				const promises: Promise<void>[] = [];

				const tarStream = tar.extract();
				tarStream.on("error", (err: Error) => {
					reject(new VError(err, "Error reading tarball stream"));
				});
				let entriesChecked: number = 0;
				tarStream.on("entry", (header: {name: string}, entryStream: stream.Readable, next: Function) => {
					if (++entriesChecked % 500 === 0) {
						console.log(`Checked ${entriesChecked} entries in the tarball...`);
					}
					if (header.name.indexOf(`./${ddragonVersion}/img/profileicon/`) === 0 && !header.name.endsWith("/")) {
						const promise: Promise<void> = saveImage(entryStream, profileIconsPath, header.name);
						// This is needed to suppress an UnhandledPromiseRejectionWarning (the rejection will actually be handled later by Promise.all())
						promise.catch(() => {});
						promises.push(promise);
					} else if (header.name.indexOf(`./${ddragonVersion}/img/champion/`) === 0 && !header.name.endsWith("/")) {
						const promise: Promise<void> = saveImage(entryStream, championIconsPath, header.name);
						// This is needed to suppress an UnhandledPromiseRejectionWarning (the rejection will actually be handled later by Promise.all())
						promise.catch(() => {});
						promises.push(promise);
					} else {
						/* "The tar archive is streamed sequentially, meaning you must drain each entry's stream as
						you get them or else the main extract stream will receive backpressure and stop reading."
						- https://github.com/mafintosh/tar-stream/blob/master/README.md */
						entryStream.resume();
					}
					next();
				});
				tarStream.on("finish", () => {
					Promise.all(promises).then(() => {
						resolve();
					}, (err) => {
						reject(new VError(err, "Error updating images"));
					});
				});

				const gunzipStream = gunzip();
				gunzipStream.on("error", (err: Error) => {
					reject(new VError(err, "Error gunzipping stream"));
				});

				response.pipe(gunzipStream).pipe(tarStream);

				/**
				 * Saves an image from the .tar.gz archive to a file. The filename is the same as the name of entry in the archive.
				 * @param imageStream A stream of the image to save
				 * @param saveDirectory The directory to save the image in
				 * @param originalPath The path of the entry inside the archive. The filename of the saved file is the same as in this.
				 */
				function saveImage(imageStream: stream.Readable, saveDirectory: string, originalPath: string): Promise<void> {
					return new Promise<void>((resolve_image: Function, reject_image: Function) => {
						const split: string[] = originalPath.split("/");
						/** The filename of the entry in the archive (and of the saved file) */
						const filename: string = split[split.length - 1];
						/** The path to save the image to */
						const savePath: string = path.join(saveDirectory, filename);
						const writeStream: fs.WriteStream = fs.createWriteStream(savePath);
						writeStream.on("error", (err: Error) => {
							// The stream needs to be drained to prevent the main TAR stream from receiving backpressure
							imageStream.resume();
							writeStream.close();
							reject_image(new VError(err, `Error saving image to ${savePath}`));
						});
						writeStream.on("finish", () => {
							resolve_image();
						});
						imageStream.pipe(writeStream);
					});
				}
			} else {
				reject(new VError(`Received ${response.statusCode} code for ${url}`));
			}
		}).on("error", (err: Error) => {
			reject(new VError(err, `Error accessing ${url}`));
		});
	});
};
