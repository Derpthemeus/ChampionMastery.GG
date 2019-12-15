import {standardizeName} from "./server";
import CacheHandler from "./CacheHandler";
import {ChampionMasteryInfo, Summoner} from "./types";
import Region from "./Region";
import RateLimiter from "./RateLimiter";
import {APIMethod, RateLimitCombo, RateLimitError} from "./RateLimiter";
import Config from "./Config";
import http = require("http");
import https = require("https");
import VError = require("verror");

const cacheHandler: CacheHandler = new CacheHandler();
const rateLimiter: RateLimiter = new RateLimiter();

/**
 * Makes a call to the API (doesn't check the cache) and returns the raw body
 * @param apiMethod The API method this request is for. In order for this call to be made, the rate limit for this method must have a request available.
 * If there is not a request available for this method, a RateLimitError will be thrown. If there are enough requests remaining for this request to be made,
 * the rate limit will have 1 request marked as used before the API request is made.
 * @param region The region the request should be made to
 * @param path The path of the API request URL, relative to "https://*.api.riotgames.com/"
 * @param query The query of the API request URL, without "?" (e.g. "foo=bar&a=b"). May be a falsy value if no query is needed.
 * 	The "api_key" parameter should not be included (it will be automatically added)
 * @async
 * @returns The raw body of the API response
 * @throws {RateLimitError} Thrown if the API call is prevented because there are not enough requests remaining
 * @throws {APIError} Thrown if the API response has a non-200 status code
 * @throws {Error} Thrown if the API request cannot be completed for some other reason
 */
function makeAPIRequest(apiMethod: APIMethod, region: Region, path: string, query?: string): Promise<string> {
	return new Promise<string>((resolve: Function, reject: Function) => {
		const rateLimitCombo: RateLimitCombo = rateLimiter.getRateLimitCombo(region, apiMethod, true);
		if (!(rateLimitCombo.hasRequestAvailable())) {
			reject(new RateLimitError());
			return;
		}
		rateLimitCombo.useRequest();

		const url: string = `https://${region.platformId}.api.riotgames.com/${path}?${query ? (query + "&") : ""}api_key=${Config.riotApiKey}`;
		https.get(url, (response: http.IncomingMessage) => {
			let body: string = "";
			response.on("data", (segment) => {
				body += segment;
			});

			response.on("error", (err: Error) => {
				reject(new VError(err, `Error receiving response from ${url}`));
			});

			response.on("end", () => {
				rateLimitCombo.updateFromHeaders(response.headers);

				if (response.statusCode === 200) {
					resolve(body);
				} else {
					reject(new APIError(body, response.statusCode, response.headers, url));
				}
			});
		}).on("error", (err: Error) => {
			reject(new VError(err, `Error making request to ${url}`));
		});
	});
}

/**
 * Tries to retrieve a summoner by name, first checking the cache then the API.
 * @param region
 * @param name
 * @async
 * @returns A Summoner object of the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs (including if the summoner is not found)
 * @throws {Error} Thrown is some other error occurs
 */
export async function getSummonerByName(region: Region, name: string): Promise<Summoner> {
	const standardizedName: string = standardizeName(name);
	const key: string = cacheHandler.makeSummonerIdKey(region, standardizedName);

	const cachedId: string = await cacheHandler.retrieve(key);
	if (cachedId !== undefined) {
		const cachedResponse = await cacheHandler.retrieve(cacheHandler.makeSummonerKey(region, cachedId));
		if (cachedResponse !== undefined) {
			return cachedResponse;
		}
	}
	try {
		// A cache hit (on both summoner ID and summoner info) would have already resulted in this function returning by now
		const body: string = await makeAPIRequest(APIMethod.GET_getBySummonerName, region, `lol/summoner/v4/summoners/by-name/${encodeURIComponent(standardizedName)}`);
		const summoner: Summoner = JSON.parse(body);
		summoner.standardizedName = standardizedName;
		cacheHandler.store(cacheHandler.makeSummonerKey(region, summoner.id), summoner, Config.cacheDurations.summoner);
		cacheHandler.store(key, summoner.id, Config.cacheDurations.summoner);
		return summoner;
	} catch (ex) {
		if (ex instanceof APIError && ex.statusCode !== 404) {
			logApiError(ex);
		}
		// APIError's and RateLimitError's are not caused by the code, so they don't need stack traces.
		if (ex instanceof APIError || ex instanceof RateLimitError) {
			throw ex;
		} else {
			throw new VError(ex, "Error getting summoner by name");
		}
	}
}

/**
 * Tries to retrieve a summoner by summoner ID, first checking the cache then the API.
 * @param region
 * @param summonerId The player's encrypted summoner ID.
 * @async
 * @returns A Summoner object for the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs (including if the summoner is not found)
 * @throws {Error} Thrown is some other error occurs.
 */
export async function getSummonerById(region: Region, summonerId: string): Promise<Summoner> {
	const key: string = cacheHandler.makeSummonerKey(region, summonerId);
	const cachedResponse: Summoner = await cacheHandler.retrieve(key);
	if (cachedResponse !== undefined) {
		return cachedResponse;
	} else {
		try {
			const body: string = await makeAPIRequest(APIMethod.GET_getBySummonerId, region, `lol/summoner/v4/summoners/${summonerId}`);
			const summoner: Summoner = JSON.parse(body);
			summoner.standardizedName = standardizeName(summoner.name);
			cacheHandler.store(key, summoner, Config.cacheDurations.summoner);
			cacheHandler.store(cacheHandler.makeSummonerIdKey(region, summoner.standardizedName), summonerId, Config.cacheDurations.summoner);
			return summoner;
		} catch (ex) {
			if (ex instanceof APIError) {
				logApiError(ex);
			}
			// APIError's and RateLimitError's are not caused by the code, so they don't need stack traces.
			if (ex instanceof APIError || ex instanceof RateLimitError) {
				throw ex;
			} else {
				throw new VError(ex, "Error getting summoner by summoner ID");
			}
		}
	}
}

/**
 * Tries to retrieve a summoner's champion mastery scores, first checking the cache then the API.
 * @param region
 * @param summonerId The player's encrypted summoner ID.
 * @async
 * @returns The champion mastery scores for the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs
 * @throws {Error} Thrown is some other error occurs
 */
export async function getChampionMasteries(region: Region, summonerId: string): Promise<ChampionMasteryInfo[]> {
	const key: string = cacheHandler.makeChampionMasteriesKey(region, summonerId);

	const cachedResponse: ChampionMasteryInfo[] = await cacheHandler.retrieve(key);
	if (cachedResponse !== undefined) {
		return cachedResponse;
	} else {
		try {
			const body: string = await makeAPIRequest(APIMethod.GET_getAllChampionMasteries, region, `lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`);
			const masteries: ChampionMasteryInfo[] = JSON.parse(body);
			cacheHandler.store(key, masteries, Config.cacheDurations.championMastery);
			return masteries;
		} catch (ex) {
			if (ex instanceof APIError) {
				logApiError(ex);
			}
			// APIError's and RateLimitError's are not caused by the code, so they don't need stack traces.
			if (ex instanceof APIError || ex instanceof RateLimitError) {
				throw ex;
			} else {
				throw new VError(ex, "Error getting champion masteries");
			}
		}
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
