import RateLimit from "./RateLimit";
import Region from "./Region";
import http = require("http");

/**
 * Handles rate limiting for all regions
 */
export default class RateLimiter {
	private regionRateLimiters: Map<Region, RegionRateLimiter> = new Map<Region, RegionRateLimiter>();

	public constructor() {
		for (const region of Region.REGIONS.values()) {
			this.regionRateLimiters.set(region, new RegionRateLimiter(region));
		}
	}

	/**
	 * Creates a RateLimitCombo for a method and application rate limit on the specified region
	 * @param region
	 * @param apiMethod The API method to include, or a falsy value if a method rate limit should not be included in the RateLimitCombo
	 * @param includeAppRateLimit If the application rate limit should be included in this combo (false for lol-static-data-v3)
	 * @returns The RateLimitCombo for the specified limits
	 */
	public getRateLimitCombo = (region: Region, apiMethod: APIMethod, includeAppRateLimit: boolean): RateLimitCombo => {
		const regionRateLimiter: RegionRateLimiter = this.regionRateLimiters.get(region);
		return new RateLimitCombo(
			includeAppRateLimit ? regionRateLimiter.getApplicationRateLimit() : null,
			regionRateLimiter.getMethodRateLimit(apiMethod)
		);
	}

	/**
	 * Parses rate limit info from a string in the form "requests1:interval1,requests2:interval2". This is the format
	 * used by the response headers "X-*-Rate-Limit" and "X-*-Rate-Limit-Count"
	 * @param header The response header to parse (in the form "requests1:interval1,requests2:interval2")
	 * @returns The parsed rate limit info, as a map with the intervals (in seconds) as keys and the number of requests as values. Returns an empty map if the header is a falsy value
	 */
	public static parseRateLimitHeader = (header: string): Map<number, number> => {
		const map: Map<number, number> = new Map<number, number>();
		if (header) {
			/** An array of interval limits in the form "requests:interval" */
			for (const intervalLimitString of header.split(",")) {
				/** The element at index 0 is the number of requests, the element at index 1 is the interval (in seconds) */
				const [requestsString, intervalString]: string[] = intervalLimitString.split(":");
				map.set(+intervalString, +requestsString);
			}
		}
		return map;
	}
}

/**
 * Handles rate limiting for a single region
 */
class RegionRateLimiter {
	private region: Region;
	private appRateLimit: RateLimit;
	private methodRateLimits: Map<APIMethod, RateLimit> = new Map<APIMethod, RateLimit>();

	public constructor(region: Region) {
		this.region = region;
	}

	/**
	 * Gets the method rate limit for the specified method, creating a new limit if one does not already exist
	 * @param apiMethod
	 * @returns The rate limit for the specified method
	 */
	public getMethodRateLimit = (apiMethod: APIMethod): RateLimit => {
		// Create the RateLimit for this method if it does not already exist
		if (!this.methodRateLimits.has(apiMethod)) {
			this.methodRateLimits.set(apiMethod, new RateLimit("method", apiMethod, this.region));
		}

		return this.methodRateLimits.get(apiMethod);
	}

	/**
	 * Gets the application rate limit, creating a new limit if it does not already exist
	 * @returns The application rate limit
	 */
	public getApplicationRateLimit = (): RateLimit => {
		// Create the RateLimit if it doesn't already exist
		if (!this.appRateLimit) {
			this.appRateLimit = new RateLimit("app", "application", this.region);
		}

		return this.appRateLimit;
	}
}

export enum APIMethod {
	GET_getBySummonerId = "GET_getBySummonerId",
	GET_getBySummonerName = "GET_getBySummonerName",
	GET_getAllChampionMasteries = "GET_getAllChampionMasteries"
}

/**
 * An error that is thrown if an API request is prevented due to an exceeded rate limit
 */
export class RateLimitError {

}

/**
 * A combination of a method rate limit and an application rate limit. This may contain 1 of these limits, both of these limits, or neither of these limits.
 */
export class RateLimitCombo {
	private applicationRateLimit?: RateLimit;
	private methodRateLimit?: RateLimit;

	public constructor(applicationRateLimit: RateLimit, methodRateLimit: RateLimit) {
		this.applicationRateLimit = applicationRateLimit;
		this.methodRateLimit = methodRateLimit;
	}

	/**
	 * Marks a request as used. hasRequestAvailable() should be checked before calling this method.
	 */
	public useRequest = (): void => {
		if (this.applicationRateLimit) {
			this.applicationRateLimit.useRequest();
		}
		if (this.methodRateLimit) {
			this.methodRateLimit.useRequest();
		}
	}

	/**
	 * Checks if at least 1 request is currently available.
	 * @returns If enough requests are available.
	 */
	public hasRequestAvailable = (): boolean => {
		return (
			this.applicationRateLimit ? this.applicationRateLimit.hasRequestAvailable() : true &&
				this.methodRateLimit ? this.methodRateLimit.hasRequestAvailable() : true
		);
	}

	/**
	 * Updates the RateLimits in this RateLimitCombo using headers from an API response
	 * @param headers The headers from an API response
	 */
	public updateFromHeaders = (headers: http.IncomingHttpHeaders): void => {
		// TODO back off if the service rate limit is exceeded
		const retryAfter: number = +headers["retry-after"];
		const limitType: string = headers["x-rate-limit-type"] as string;
		if (this.applicationRateLimit) {
			this.applicationRateLimit.updateFromHeaders(headers["x-app-rate-limit"] as string, headers["x-app-rate-limit-count"] as string, limitType === "application" ? retryAfter : null);
		}
		if (this.methodRateLimit) {
			this.methodRateLimit.updateFromHeaders(headers["x-method-rate-limit"] as string, headers["x-method-rate-limit-count"] as string, limitType === "method" ? retryAfter : null);
		}
	}
}
