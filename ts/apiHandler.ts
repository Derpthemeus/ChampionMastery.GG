import {standardizeName} from "./server";
import CacheHandler from "./CacheHandler";
import {ChampionMasteryInfo, IntervalLimitInfo, Summoner} from "./types";
import Region from "./Region";
import RateLimit from "./RateLimit";
import {RateLimitError} from "./RateLimit";
import Config from "./Config";
import http = require("http");
import https = require("https");
import VError = require("verror");

// Rate limits are initialized without any interval limits. Interval limits will be set once updateRateLimits() is called
const RATE_LIMITS = {
	application: new RateLimit("app", []),
	summonerBySummonerId: new RateLimit("method", []),
	summonerByName: new RateLimit("method", []),
	championMasteries: new RateLimit("method", [])
};
const cacheHandler: CacheHandler = new CacheHandler();

/**
 * Makes a call to the API (doesn't check cache) and returns the raw body
 * @param rateLimits An array of RateLimits that must each have remaining requests for the API call to be made. If any of the rate limits do not have
 * a request available, a RateLimitError will be thrown. If there are enough requests remaining for this request to be made, each rate limit will
 * have 1 request marked as used before the API request is made.
 *  If this is set to a falsy value, no rate limits will be checked/updated.
 *  If 'shouldUpdateRateLimits' is set to true, these rate limits will be updated based on response headers instead of being used to check if there are
 * enough requests available
 * @param region The region the request should be made to
 * @param path The path of the API request URL, relative to "https://*.api.riotgames.com/"
 * @param query The query of the API request URL, without "?" (e.g. "foo=bar&a=b"). May be a falsy value if no query is needed.
 * 	The "api_key" parameter should not be included (it will be automatically added)
 * @param shouldUpdateRateLimits If set to true, the response headers will be used to update rate limit information (rate limits will not be checked before making
 * the request). The "X-App-Rate-Limit" header will be used to update the first RateLimit in 'rateLimits' where 'type' is "app", and the
 * "X-Method-Rate-Limit" header will be used to update the first RateLimit in 'rateLimits' where 'type' is "method".
 * @async
 * @returns The raw body of the API response
 * @throws {RateLimitError} Thrown if the API call is prevented because there are not enough requests remaining, or the API call fails due to an exceeded rate limit
 * @throws {APIError} Thrown if the API response has a non-200 status code (a 429 caused by an exceeded API key rate limit will throw a RateLimitError instead)
 * @throws {Error} Thrown if the API request cannot be completed for some other reason
 */
function makeAPIRequest(rateLimits: RateLimit[], region: Region, path: string, query?: string, shouldUpdateRateLimits: boolean = false): Promise<string> {
	return new Promise<string>((resolve: Function, reject: Function) => {
		if (rateLimits && !shouldUpdateRateLimits) {
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
				reject(new VError(err, `Error receiving response from ${url}`));
			});

			response.on("end", () => {
				if (shouldUpdateRateLimits) {
					for (const limitType of ["app", "method"]) {
						const limitsHeader: string = response.headers[`x-${limitType}-rate-limit`] as string;
						if (limitsHeader) {
							const intervalLimits: IntervalLimitInfo[] = parseRateLimitHeader(limitsHeader);
							const requestsUsed: IntervalLimitInfo[] = parseRateLimitHeader(response.headers[`x-${limitType}-rate-limit-count`] as string);
							for (const rateLimit of rateLimits) {
								if (rateLimit.type === limitType) {
									rateLimit.setLimits(intervalLimits, requestsUsed);
									break;
								}
							}
						}
					}
				}

				if (response.statusCode === 200) {
					resolve(body);
				} else {
					// This will actually be "application" instead of "app" here, but that will be changed next line.
					/** The exceeded rate limit type (if any). This will be "app" or "method" for an exceeded user limit. */
					let limitType: string = response.headers["x-rate-limit-type"] as string;
					// The "X-Rate-Limit-Type" header uses "application", everything else uses "app". Converting "application" to "app" makes life easier
					limitType = limitType === "application" ? "app" : limitType;

					// 429 responses that weren't caused by an exceeded user rate limit are considered APIError's, not RateLimitError's
					if (response.statusCode === 429 && (limitType === "app" || limitType === "method")) {
						const retryHeader: string = response.headers["retry-after"] as string;
						/** How long to wait before making another API call (in seconds) */
						const retryAfter: number = +retryHeader;
						if (!isNaN(retryAfter)) {
							// Parse how many requests have been used for each interval
							const headerLimits: IntervalLimitInfo[] = parseRateLimitHeader(response.headers[`x-${limitType}-rate-limit-count`] as string);

							// Find the RateLimit that was exceeded and reset it
							for (const rateLimit of rateLimits) {
								if (rateLimit.type === limitType) {
									for (const headerLimit of headerLimits) {
										const intervalLimit = rateLimit.intervalLimits.get(headerLimit.interval);
										if (intervalLimit && intervalLimit.maxRequests < headerLimit.requests) {
											intervalLimit.remainingRequests = 0;
											intervalLimit.resetTimer.reschedule(retryAfter);
											/* Even if multiple IntervalLimit's were exceeded, only 1 needs to be updated
											(the entire RateLimit is considered exceeded if 1 IntervalLimit is exceeded) */
											break;
										}
									}
								}
							}

							reject(new RateLimitError());
						} else {
							/* All user rate limit errors should contain a valid "Retry-After" header. If this header is missing, it doesn't affect
							the calling function, so the error is just logged and a more informative APIError is thrown (instead of an Error caused
							about the missing/invalid header). */
							console.error(`Invalid Retry-After header received for API call to ${url}: ${retryHeader}`);
							reject(new APIError(body, response.statusCode, response.headers, url));
						}
					} else {
						reject(new APIError(body, response.statusCode, response.headers, url));
					}
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
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs (including if the summoner is not found)
 * @throws {Error} Thrown is some other error occurs
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
		const body: string = await makeAPIRequest([RATE_LIMITS.application, RATE_LIMITS.summonerByName], region, `lol/summoner/v3/summoners/by-name/${encodeURIComponent(standardizedName)}`);
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
 * @param summonerId
 * @async
 * @returns A Summoner object for the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs (including if the summoner is not found)
 * @throws {Error} Thrown is some other error occurs.
 */
export async function getSummonerById(region: Region, summonerId: number): Promise<Summoner> {
	const key: string = cacheHandler.makeSummonerKey(region, summonerId);
	const cachedResponse: Summoner = await cacheHandler.retrieve(key);
	if (cachedResponse !== undefined) {
		return cachedResponse;
	} else {
		try {
			const body: string = await makeAPIRequest([RATE_LIMITS.application, RATE_LIMITS.summonerBySummonerId], region, `lol/summoner/v3/summoners/${summonerId}`);
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
 * @param summonerId
 * @async
 * @returns The champion mastery scores for the specified summoner
 * @throws {RateLimitError} Thrown if the API request is prevented or fails due to an exceeded rate limit
 * @throws {APIError} Thrown if an API error occurs
 * @throws {Error} Thrown is some other error occurs
 */
export async function getChampionMasteries(region: Region, summonerId: number): Promise<ChampionMasteryInfo[]> {
	const key: string = cacheHandler.makeChampionMasteriesKey(region, summonerId);

	const cachedResponse: ChampionMasteryInfo[] = await cacheHandler.retrieve(key);
	if (cachedResponse !== undefined) {
		return cachedResponse;
	} else {
		try {
			const body: string = await makeAPIRequest([RATE_LIMITS.application, RATE_LIMITS.championMasteries], region, `lol/champion-mastery/v3/champion-masteries/by-summoner/${summonerId}`);
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
 * Makes some API calls and updates rate limits based on the response headers from the calls. If the first attempt fails, it will automatically try
 * again by looking up a different summoner.
 * @param useFallback (Optional) If the backup summoner name/region should be used. Defaults to 'false'.
 * @async
 * @throws {Error} Thrown if an error occurs when trying to update rate limits using both the default and fallback summoner/region.
 */
export const updateRateLimits = async (useFallback: boolean = false): Promise<void> => {
	const region: Region = Region.REGIONS.get(useFallback ? Config.fallbackSummonerRegion : Config.summonerRegion);
	const summoner: string = useFallback ? Config.fallbackSummonerName : Config.summonerName;
	try {
		const responseBody: string = await makeAPIRequest([RATE_LIMITS.summonerByName], region, `lol/summoner/v3/summoners/by-name/${encodeURIComponent(summoner)}`, null, true);
		const summonerId: number = JSON.parse(responseBody).id;
		await Promise.all([
			makeAPIRequest([RATE_LIMITS.summonerBySummonerId], region, `lol/summoner/v3/summoners/${summonerId}`, null, true),
			makeAPIRequest([RATE_LIMITS.application, RATE_LIMITS.championMasteries], region, `lol/champion-mastery/v3/champion-masteries/by-summoner/${summonerId}`, null, true)
		]);
		console.log("Updated rate limits");
	} catch (ex) {
		if (!useFallback) {
			console.log(`Could not determine rate limits using summoner ${summoner} (${region.id}), using fallback summoner...`);
			return updateRateLimits(true);
		} else {
			throw new VError(ex, "Error determining rate limits");
		}
	}
};

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
 * Parses rate limit info from a string in the form "requests1:interval1,requests2:interval2". This is the format
 * used by the response headers "X-*-Rate-Limit" and "X-*-Rate-Limit-Count"
 * @param header The response header to parse in the form "requests1:interval1,requests2:interval2"
 * @returns The parsed rate limit info
 */
const parseRateLimitHeader = (header: string): IntervalLimitInfo[] => {
	/** An array of interval limits in the form "requests:interval" */
	const intervalLimits: IntervalLimitInfo[] = [];
	for (const intervalLimitString of header.split(",")) {
		/** The element at index 0 is the number of requests, the element at index 1 is the interval (in seconds) */
		const split: string[] = intervalLimitString.split(":");
		intervalLimits.push({
			requests: +split[0],
			interval: +split[1]
		});
	}
	return intervalLimits;
};

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
	public constructor(body: string, statusCode: number, headers: http.IncomingHttpHeaders, url: string) {
		this.body = body;
		this.statusCode = statusCode;
		this.headers = headers;
		this.url = url;
	}
}
