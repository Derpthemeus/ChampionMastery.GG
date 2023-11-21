import CacheHandler from "./CacheHandler";
import Region from "./Region";
import Config from "./Config";
import http = require("http");
import https = require("https");
import VError = require("verror");

const cacheHandler: CacheHandler = new CacheHandler();
const httpModule = Config.highscoresServiceUrl.startsWith("https://") ? https : http;

/**
 * Makes an API request to the highscores service.
 * @param path The path of the request (e.g. "highscoresSummary")
 * @param query key/value pairs to encode in the query string.
 * @return A Promise that will be resolved with the body of the response, or rejected with an Error.
 */
function makeHighscoresServiceAPIRequest(path: string, query: {[key: string]: string | number} = {}): Promise<string> {
	return new Promise<string>((resolve: Function, reject: Function) => {
		const queryString: string = Object.keys(query).map((key) =>
			`${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
		).join("&");
		const url: string = `${Config.highscoresServiceUrl}/${path}/${queryString ? ("?" + queryString) : ""}`;

		httpModule.get(url, (response: http.IncomingMessage) => {
			let body: string = "";
			response.on("data", (segment) => {
				body += segment;
			});

			response.on("error", (err: Error) => {
				reject(new VError(err, "%s", `Error receiving response from ${url}`));
			});

			response.on("end", () => {
				if (response.statusCode === 200) {
					resolve(body);
				} else {
					reject(new APIError(body, response.statusCode, response.headers, url));
				}
			});
		}).on("error", (err: Error) => {
			reject(new VError(err, "%s", `Error making request to ${url}`));
		});
	});
}

/**
 * Retrieves summoner info and champion mastery scores for the specified summoner, first checking the cache then the
 * highscores service.
 * @param region The summoner's region.
 * @param summonerName The summoner's summoner name.
 * @return A Promise that will be resolved with information about this summoner and their mastery scores, or rejected
 * with an error.
 */
export async function getSummonerInfo(region: Region, summonerName: string): Promise<SummonerInfo> {
	// Check the cache.
	const key: string = cacheHandler.makeSummonerKey(region, summonerName);

	const cachedId: string = await cacheHandler.retrieve(key);
	if (cachedId !== undefined) {
		const cachedResponse: SummonerInfo = await cacheHandler.retrieve(cacheHandler.makeSummonerKey(region, cachedId));
		if (cachedResponse !== undefined) {
			return cachedResponse;
		}
	}

	// Make a request to the highscore service if the data wasn't in the cache.
	try {
		const body: string = await makeHighscoresServiceAPIRequest("summonerInfo", {
			summonerName: summonerName,
			platform: region.platformId
		});
		const response: SummonerInfo = JSON.parse(body);
		cacheHandler.store(cacheHandler.makeSummonerKey(region, response.id), response, Config.cacheDurations.summoner);
		return response;
	} catch (ex) {
		if (ex instanceof APIError && ex.statusCode !== 404) {
			logApiError(ex);
		}
		// APIErrors are not caused by the code, so they don't need stack traces.
		if (ex instanceof APIError) {
			throw ex;
		} else {
			throw new VError(ex, "%s", "Error getting summoner by name");
		}
	}
}

/**
 * Retrieves the top players for each champion.
 * @return A Promise that will be resolved with the top 3 scores for each champion (mapped by champion ID), or rejected
 * with an error.
 */
export async function getHighscoresSummary(): Promise<{[championId: string]: Highscore[]}> {
	try {
		const body: string = await makeHighscoresServiceAPIRequest("highscoresSummary");
		return JSON.parse(body);
	} catch (ex) {
		throw new VError(ex, "%s", "Error retrieving highscores summary from highscores service");
	}
}

/**
 * Retrieves the top scores for the specified champion.
 * @param championId The ID of the champion to retrieve scores for.
 * @return A Promise that will be resolved with the top scores for the specified champion, or rejected with an error.
 */
export async function getChampionHighscores(championId: number): Promise<Highscore[]> {
	try {
		const body: string = await makeHighscoresServiceAPIRequest("championHighscores", {championId: championId});
		return JSON.parse(body);
	} catch (ex) {
		throw new VError(ex, "%s", `Error retrieving champion highscores from highscores service for champion ${championId}`);
	}
}

/**
 * Checks if API errors should be logged, and logs the specified error if they should.
 * @param error The error to log
 */
function logApiError(error: APIError): void {
	if (Config.logApiErrors) {
		console.log(`Error from API for ${error.url}: ${error.body} (${error.statusCode})`);
	}
}


/**
 * Used for any response from the API with a status code other than 200.
 */
export class APIError {
	/** The un-parsed body of the response. This is not necessarily valid JSON. */
	public readonly body: string;
	/** The HTTP status code of the response */
	public readonly statusCode: number;
	/** The headers of the response */
	public readonly headers: any;
	/** The API URL that returned this error */
	public readonly url: string;

	/**
	 * @param body The un-parsed body of the response
	 * @param statusCode The HTTP status code of the response
	 * @param headers The headers of the response
	 * @param url The API URL that returned this error
	 */
	public constructor(body: string, statusCode: number, headers: http.IncomingHttpHeaders, url: string) {
		this.body = body;
		this.statusCode = statusCode;
		this.headers = headers;
		this.url = url;
	}
}

/**
 * Info for a single champion from a response from https://developer.riotgames.com/api-methods/#champion-mastery-v4/GET_getAllChampionMasteries
 */
export interface ChampionMasteryResponse {
	championId: number;
	championPoints: number;
	chestGranted: boolean;
	championLevel: number;
	championPointsUntilNextLevel: number;
	championPointsSinceLastLevel: number;
	lastPlayTime: number;
	tokensEarned: number;
}

export interface SummonerInfo {
	/** Encrypted summoner ID */
	id: string;
	/** Encrypted account ID */
	accountId: string;
	/** Encrypted PUUID */
	puuid: string;
	/** Summoner name */
	name: string;
	profileIconId: number;
	/** The summoner's level (used to determine if the player has exercised their right to be forgotten through Riot Games). */
	summonerLevel: number;
	scores: ChampionMasteryResponse[];
}

/**
 * A single highscores entry.
 */
export interface Highscore {
	/** Summoner name */
	name: string;
	/** The ID of the player's region. */
	region: string;
	/** How many mastery points the player has on the champion */
	points: number;
}
