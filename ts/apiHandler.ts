import {REGIONS, standardizeName} from "./server";
import CacheHandler from "./CacheHandler";
import {ChampionList, ChampionMasteryInfo, Region, Summoner} from "./types";
import RateLimit from "./RateLimit";
import {RateLimitError} from "./RateLimit";
import http = require("http");
import https = require("https");
import Config from "./Config";

/** The default region to use when downloading static data */
const DEFAULT_STATIC_DATA_REGION_ID: string = "NA";
/** The region to download static data from if there is an error when using the default region */
const FALLBACK_STATIC_DATA_REGION_ID: string = "EUW";

const APP_RATE_LIMIT = new RateLimit("application", Config.rateLimits.application);
const METHOD_RATE_LIMITS = {
	summoner: new RateLimit("method", Config.rateLimits.method.summoner),
	championMastery: new RateLimit("method", Config.rateLimits.method.championMastery)
};
const cacheHandler = new CacheHandler();

/**
 * Makes a call to the API (doesn't check cache) and returns the raw body
 * @param rateLimits An array of RateLimits that must each have remaining requests for the API call to be made.
 *  Each rate limit will each have 1 request marked as used before the API request is made.
 * 	May be a falsy value if the endpoint doesn't use any rate limits.
 * 	If any of the rate limits do not have a request available, a RateLimitError will be thrown.
 * @param region The region the request should be made to
 * @param path The path of the API request URL, relative to "https://*.api.riotgames.com/"
 * @param query The query of the API request URL, without "?" (e.g. "foo=bar&a=b"). May be a falsy value if no query is needed.
 * 	The "api_key" parameter should not be included (it will be automatically added)
 * @async
 * @returns The raw body of the API response if the response code was 200
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if the API response has a non 200 status code (a 429 caused by an exceeded API key rate limit will throw a RateLimitError instead)
 * @throws {Error} Thrown if the API request cannot be completed for some reason
 */
export function makeAPIRequest(rateLimits: RateLimit[], region: Region, path: string, query?: string): Promise<string> {
	return new Promise<string>((resolve: Function, reject: Function) => {
		if (rateLimits) {
			for (const rateLimit of rateLimits) {
				if (!rateLimit.hasRequestAvailable()) {
					reject(new RateLimitError());
					return;
				}
			}
			for (const rateLimit of rateLimits) {
				rateLimit.useRequest();
			}
		}

		const url: string = `https://${region.platformId}.api.riotgames.com/${path}?${query ? (query + "&") : ""}api_key=${Config.riotApiKey}`;
		https.get(url, (response: http.IncomingMessage) => {
			let body: string = "";
			response.on("data", (segment) => {
				body += segment;
			});

			response.on("error", (err: Error) => {
				console.error(`Error receiving response from URL ${url}: `, err);
				reject(err);
			});

			response.on("end", () => {
				if (response.statusCode === 200) {
					resolve(body);
				} else {
					if (response.statusCode === 429) {
						const limitType: string = response.headers["x-rate-limit-type"];
						// 429 responses that don't include a valid X-Rate-Limit-Type header are considered normal APIError's, not RateLimitError's
						if (limitType === "application" || limitType === "method") {
							const retryHeader: string = response.headers["retry-after"];
							const retryAfter: number = +retryHeader;
							if (!isNaN(retryAfter)) {
								// Parse how many requests have been used for each interval
								/** An array of interval limits in the form "requestsUsed:interval" */
								const headerLimitsStrings: string[] = response.headers[`x-${limitType === "method" ? "method" : "app"}-rate-limit-count`].split(",");
								const headerLimits: {usedRequests: number, interval: number}[] = [];
								for (const intervalLimitString of headerLimitsStrings) {
									/** The element at index 0 is the number of requests used, the element at index 1 is the interval (in seconds) */
									const split: string[] = intervalLimitString.split(":");
									headerLimits.push({
										usedRequests: +split[0],
										interval: +split[1]
									});
								}

								// Find the RateLimit that was exceeded and reset it
								for (const rateLimit of rateLimits) {
									if (rateLimit.type === limitType) {
										for (const headerLimit of headerLimits) {
											const intervalLimit = rateLimit.intervalLimits.get(headerLimit.interval);
											if (intervalLimit && intervalLimit.maxRequests < headerLimit.usedRequests) {
												intervalLimit.remainingRequests = 0;
												intervalLimit.resetTimer.reschedule(retryAfter);
												/*
												Even if multiple IntervalLimit's were exceeded, only 1 needs to be updated
												(the entire RateLimit is considered exceeded if 1 IntervalLimit is exceeded)
												*/
												break;
											}
										}
									}
								}

								reject(new RateLimitError());
							} else {
								// All user rate limit errors should contain a Retry-After header
								console.error("Invalid Retry-After header received: ", retryHeader);
								reject(new APIError(body, response.statusCode, response.headers, url));
								return;
							}
						}
					} else {
						reject(new APIError(body, response.statusCode, response.headers, url));
					}
				}
			});
		}).on("error", (err: Error) => {
			console.error(`Error making request to URL ${url}: `, err);
			reject(err);
		});
	});
}


/**
 * Tries to retrieve a summoner by name, first checking the cache then the API.
 * @param region
 * @param name
 * @async
 * @returns A Summoner object of the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs (including if the summoner is not found)
 */
export async function getSummonerByName(region: Region, name: string): Promise<Summoner> {
	const standardizedName: string = standardizeName(name);
	const key: string = cacheHandler.makeSummonerIdKey(region, standardizedName);

	const cachedId: number = await cacheHandler.retrieve(key);
	if (cachedId !== undefined) {
		const cachedResponse = await cacheHandler.retrieve(cacheHandler.makeSummonerKey(region, cachedId));
		if (cachedResponse !== undefined) {
			return cachedResponse;
		}
	}
	try {
		// A cache hit (on both summoner ID and summoner info) would have already resulted in this function returning by now
		const body: string = await makeAPIRequest([APP_RATE_LIMIT, METHOD_RATE_LIMITS.summoner], region, `/lol/summoner/v3/summoners/by-name/${encodeURIComponent(standardizedName)}`);
		const summoner: Summoner = JSON.parse(body);
		summoner.standardizedName = standardizedName;
		cacheHandler.store(cacheHandler.makeSummonerKey(region, summoner.id), summoner, Config.cacheDurations.summoner);
		cacheHandler.store(key, summoner.id, Config.cacheDurations.summoner);
		return summoner;
	} catch (ex) {
		if (ex instanceof APIError && ex.statusCode !== 404) {
			logApiError(ex);
		}
		throw ex;
	}
}



/**
 * Tries to retrieve a summoner by summoner ID, first checking the cache then the API.
 * @param region
 * @param summonerId
 * @async
 * @returns A Summoner object for the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs (including if the summoner is not found)
 */
export async function getSummonerById(region: Region, summonerId: number): Promise<Summoner> {
	const key: string = cacheHandler.makeSummonerKey(region, summonerId);
	const cachedResponse: Summoner = await cacheHandler.retrieve(key);
	if (cachedResponse !== undefined) {
		return cachedResponse;
	} else {
		try {
			const body: string = await makeAPIRequest([APP_RATE_LIMIT, METHOD_RATE_LIMITS.summoner], region, `/lol/summoner/v3/summoners/${summonerId}`);
			const summoner: Summoner = JSON.parse(body);
			summoner.standardizedName = standardizeName(summoner.name);
			cacheHandler.store(key, summoner, Config.cacheDurations.summoner);
			cacheHandler.store(cacheHandler.makeSummonerIdKey(region, summoner.standardizedName), summonerId, Config.cacheDurations.summoner);
			return summoner;
		} catch (ex) {
			if (ex instanceof APIError) {
				logApiError(ex);
			}
			throw ex;
		}
	}
}

/**
 * Tries to retrieve a summoner's champion mastery scores, first checking the cache then the API.
 * @param region
 * @param summonerId
 * @async
 * @returns The champion mastery scores for the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs
 */
export async function getChampionMasteries(region: Region, summonerId: number): Promise<ChampionMasteryInfo[]> {
	const key: string = cacheHandler.makeChampionMasteriesKey(region, summonerId);

	const cachedResponse: ChampionMasteryInfo[] = await cacheHandler.retrieve(key);
	if (cachedResponse !== undefined) {
		return cachedResponse;
	} else {
		try {
			const body: string = await makeAPIRequest([APP_RATE_LIMIT, METHOD_RATE_LIMITS.championMastery], region, `/lol/champion-mastery/v3/champion-masteries/by-summoner/${summonerId}`);
			const masteries: ChampionMasteryInfo[] = JSON.parse(body);
			cacheHandler.store(key, masteries, Config.cacheDurations.championMastery);
			return masteries;
		} catch (ex) {
			if (ex instanceof APIError) {
				logApiError(ex);
			}
			throw ex;
		}
	}
}


/**
 * Gets a list of champions and the latest DDragon version from the static data API.
 * @param region (Optional) the region to get static data from. Defaults to DEFAULT_STATIC_DATA_REGION_ID.
 * @async
 * @returns A ChampionList containing all champions and the latest DDragon version
 * @throws {Error} Thrown if an error occurs when retrieving or parsing static data from both the default region and the fallback region.
 */
export async function getChampions(region: Region = REGIONS.get(DEFAULT_STATIC_DATA_REGION_ID)): Promise<ChampionList> {
	try {
		const body: string = await makeAPIRequest(null, region, "/lol/static-data/v3/champions", "tags=image&dataById=true");
		const championList: ChampionList = JSON.parse(body);
		return championList;
	} catch (ex) {
		if (ex instanceof APIError) {
			logApiError(ex);
		}
		if (region.id !== FALLBACK_STATIC_DATA_REGION_ID) {
			console.log(`Could not access static data from ${region.id}, attempting to access static data from ${FALLBACK_STATIC_DATA_REGION_ID}`);
			return getChampions(REGIONS.get(FALLBACK_STATIC_DATA_REGION_ID));
		} else {
			throw ex;
		}
	}
}

/**
 * Checks if API errors should be logged, and logs the specified error if they should.
 * @param error The error to log
 */
function logApiError(error: APIError) {
	if (Config.logApiErrors) {
		console.log(`Error from API for ${error.url}: ${error.body} (${error.statusCode})`);
	}
}


/**
 * Used for any response from the API with a status code other than 200.
 * A RateLimitError may be used instead if the error was caused by an exceeded user rate limit
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
	public constructor(body: string, statusCode: number, headers: any, url: string) {
		this.body = body;
		this.statusCode = statusCode;
		this.headers = headers;
		this.url = url;
	}
}
