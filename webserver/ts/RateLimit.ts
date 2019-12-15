import RateLimiter from "./RateLimiter";
import Region from "./Region";

/**
 * A single RateLimit handles multiple limits with different intervals (e.g. 10 requests every 10 seconds, 500 requests every 10 minutes).
 * If 1 IntervalLimit of the RateLimit is exceeded, the RateLimit is considered exceeded.
 */
export default class RateLimit {
	/** The type of rate limit */
	public type: LimitType;
	/** The name of the API method this limit is for ("application" if it is an application rate limit) */
	private method: string;
	private region: Region;
	/** IntervalLimits mapped to their interval (in seconds) */
	public intervalLimits: Map<number, IntervalLimit> = new Map<number, IntervalLimit>();
	/** A string in the form of a "X-*-Rate-Limit" header that indicates the limits of this RateLimit, or 'null' if this RateLimit has not yet been initialized */
	private limitsString: string = null;

	/**
	 * Initializes an empty RateLimit. The rate limits should be populated using updateFromHeaders()
	 * @param type The type of rate limit
	 * @param method The name of the API method this limit is for ("application" if it is an application rate limit)
	 * @param region
	 */
	public constructor(type: LimitType, method: string, region: Region) {
		this.type = type;
		this.method = method;
		this.region = region;
	}

	/**
	 * Marks a request as used. hasRequestAvailable() should be checked before calling this method.
	 */
	public useRequest = (): void => {
		for (const intervalLimit of this.intervalLimits.values()) {
			intervalLimit.useRequest();
		}
	}

	/**
	 * Checks if at least 1 request is currently available.
	 * @returns If enough requests are available.
	 */
	public hasRequestAvailable = (): boolean => {
		// Check if rate limits have been initialized
		if (!this.limitsString) {
			/* Always allowing a request to be made before the rate limits have been initialized has a few problems:
				1. It is possible that enough requests will be made to exceed the rate limits before they can be determined.
				2. The first window will not properly track the number of requests that have been used.
			However, these problems are infrequent edge cases (they will only occur if a large burst of requests is made right after the server
			starts) and it is much simpler to just handle things by always allowing the requests to be made instead of blocking
			requests until limits can be determined. */
			// Allow the request to be made so rate limits can be determined from response headers
			return true;
		}

		for (const intervalLimit of this.intervalLimits.values()) {
			if (intervalLimit.requestsUsed >= intervalLimit.maxRequests) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Updates the rate limit info (rate limits, requests used, and reset time) using headers from an API response.
	 * Rate limits will be updated if they have changed.
	 * Requests used info will be updated if this RateLimit has not yet been initialized, or if 'retryAfter' is a truthy value.
	 * The reset timer will be updated if 'retryAfter' is a truthy value.
	 * @param limitsHeader The value of the "X-*-Rate-Limit" header that is relevant to this RateLimit
	 * @param requestsUsedHeader The value of the "X-*-Rate-Limit-Count" header that is relevant to this RateLimit
	 * @param retryAfter The value of the "Retry-After" header (or a falsy value if this RateLimit was not exceeded)
	 */
	public updateFromHeaders = (limitsHeader: string, requestsUsedHeader: string, retryAfter: number): void => {
		/** If the number of requests used should be updated from response headers */
		// Update requests used if 'retryAfter' is truthy, or rate limits have not been initialized
		const shouldUpdateRequestsUsed: boolean = this.limitsString === null || !!retryAfter;

		// Update rate limits if they have changed or have not been initialized yet
		if (limitsHeader !== this.limitsString) {
			this.limitsString = limitsHeader;
			const newLimitsMap: Map<number, number> = RateLimiter.parseRateLimitHeader(limitsHeader);
			const newIntervalLimits: Map<number, IntervalLimit> = new Map<number, IntervalLimit>();

			for (const [interval, maxRequests] of newLimitsMap) {
				const newLimit: IntervalLimit = new IntervalLimit(interval, maxRequests);
				newLimit.requestsUsed = this.intervalLimits.has(interval) ? this.intervalLimits.get(interval).requestsUsed : 0;
				newIntervalLimits.set(newLimit.interval, newLimit);
			}
			this.intervalLimits = newIntervalLimits;
		}

		// Update requests used if 'retryAfter' is truthy, or rate limits have not been initialized
		if (shouldUpdateRequestsUsed) {
			const requestsUsedMap: Map<number, number> = RateLimiter.parseRateLimitHeader(requestsUsedHeader);
			for (const intervalLimit of this.intervalLimits.values()) {
				/* If a rate limit is exceeded, multiple requests that will result in 429 errors may be made before a response is received.
				Since it is unknown which request will be processed first, use the greater value between the internally tracked number of
				requests used, and the number of requests used according to the response header. */
				intervalLimit.requestsUsed = Math.max(intervalLimit.requestsUsed, requestsUsedMap.get(intervalLimit.interval));
			}
		}

		// Update reset timer for exceeded IntervalLimit
		if (retryAfter) {
			console.warn(`${this.method} rate limit exceeded on ${this.region.id}`);
			for (const intervalLimit of this.intervalLimits.values()) {
				if (intervalLimit.requestsUsed > intervalLimit.maxRequests) {
					intervalLimit.rescheduleReset(retryAfter);
				}
			}
		}
	}
}

/**
 * Handles the limiting for a single interval (e.g. 10 requests per 10 seconds)
 */
class IntervalLimit {
	/** How long a window lasts (in seconds) */
	public interval: number;
	/** The maximum number of requests that can be made every window */
	public maxRequests: number;
	/** How many requests have been used this window */
	public requestsUsed: number = 0;
	/** The timer that will run when the current window ends ('null' if there is not currently an active window) */
	public resetTimeout: NodeJS.Timer = null;

	/**
	 * @param interval How long a window lasts (in seconds)
	 * @param maxRequests The maximum number of requests that can be made every window
	 */
	constructor(interval: number, maxRequests: number) {
		this.interval = interval;
		this.maxRequests = maxRequests;
	}

	/**
	 * Marks a request as used, starting a new window if needed.
	 */
	public useRequest = (): void => {
		this.requestsUsed++;

		// Start a new window if one is not already active
		if (!this.resetTimeout) {
			this.resetTimeout = setTimeout(this.reset, this.interval * 1000);
		}
	}

	/**
	 * Sets how long until the next reset occurs
	 * This does NOT affect how many requests are remaining until the reset occurs.
	 * @param delay How long until the next reset should occur (in seconds)
	 */
	public rescheduleReset = (delay: number): void => {
		clearTimeout(this.resetTimeout);
		this.resetTimeout = setTimeout(this.reset, delay * 1000);
	}

	/**
	 * Refills all requests for this IntervalLimit and clears 'resetTimeout'
	 */
	private reset = (): void => {
		clearTimeout(this.resetTimeout);
		this.resetTimeout = null;
		this.requestsUsed = 0;
	}
}

type LimitType = "method" | "app";
