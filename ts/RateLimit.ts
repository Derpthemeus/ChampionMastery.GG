import {IntervalLimitInfo} from "./types";

/**
 * A single RateLimit handles multiple limits with different intervals (e.g. 10 requests every 10 seconds, 500 requests every 10 minutes).
 * If 1 IntervalLimit of the RateLimit is exceeded, the entire RateLimit is considered exceeded.
 */
export default class RateLimit {
	/** The type of rate limit (either "app" or "method") */
	public type: string;
	/** IntervalLimits mapped to the interval (in seconds) */
	public intervalLimits: Map<number, IntervalLimit> = new Map<number, IntervalLimit>();

	/**
	 * @param type The type of rate limit (either "app" or "method")
	 * @param limits an array of data for each interval limit. 'requests' is the maximum number of requests that can be made each interval.
	 * @param requestsUsed (Optional) how many requests have been used for each interval (used when setting initial number of requests remaining).
	 * If omitted, it is assumed that no requests have been used.
	 */
	public constructor(type: string, limits: IntervalLimitInfo[], requestsUsed?: IntervalLimitInfo[]) {
		this.type = type;
		this.setLimits(limits, requestsUsed);
	}

	/**
	 * Sets the limits for each interval in this RateLimit
	 * @param limits an array of data for each interval limit. requests' is the maximum number of requests that can be made each interval.
	 * @param requestsUsed (Optional) how many requests have been used for each interval limit (used when setting initial number of requests remaining).
	 * If omitted, it is assumed that no requests have been used.
	 */
	public setLimits(limits: IntervalLimitInfo[], requestsUsed?: IntervalLimitInfo[]): void {
		const newLimits: Map<number, IntervalLimit> = new Map<number, IntervalLimit>();
		for (const limitData of limits) {
			const intervalLimit: IntervalLimit = new IntervalLimit(limitData.interval, limitData.requests);
			// Copy reset timer and remaining requests from old interval limit (if it exists)
			if (this.intervalLimits.has(limitData.interval)) {
				const oldIntervalLimit: IntervalLimit = this.intervalLimits.get(limitData.interval);
				intervalLimit.remainingRequests = oldIntervalLimit.remainingRequests;
				intervalLimit.resetTimer.reschedule((oldIntervalLimit.resetTimer.targetTime - Date.now()) / 1000);
			}
			// Update requests used based on headers (if specified)
			if (requestsUsed) {
				for (const intervalRequestsUsed of requestsUsed) {
					if (intervalRequestsUsed.interval === limitData.interval) {
						intervalLimit.remainingRequests = limitData.requests - intervalRequestsUsed.requests;
						break;
					}
				}
			}
			newLimits.set(intervalLimit.interval, intervalLimit);
		}
		// Cancel the old timers
		for (const oldIntervalLimit of this.intervalLimits.values()) {
			clearTimeout(oldIntervalLimit.resetTimer.timeout);
		}

		this.intervalLimits = newLimits;
	}

	/**
	 * Marks a request as used. hasRequestAvailable() should be checked before calling this method.
	 */
	public useRequest = (): void => {
		for (const intervalLimit of this.intervalLimits.values()) {
			intervalLimit.remainingRequests--;
		}
	}

	/**
	 * Checks if at least 1 request is currently available.
	 * @returns If enough requests are available.
	 */
	public hasRequestAvailable = (): boolean => {
		for (const intervalLimit of this.intervalLimits.values()) {
			if (intervalLimit.remainingRequests < 1) {
				return false;
			}
		}
		return true;
	}
}

/**
 * Handles the limiting for a single interval (such as 10 requests per 10 seconds)
 */
class IntervalLimit {
	/** How often to reset the remaining requests (in seconds) */
	public interval: number;
	/** The maximum number of requests that can be made every interval */
	public maxRequests: number;
	/** How many requests can still be used this interval */
	public remainingRequests: number;
	/** The timer that handles resetting remainingRequests every interval */
	public resetTimer: ResetTimer;

	/**
	 * @param interval How often to reset the remaining requests (in seconds)
	 * @param maxRequests The maximum number of requests that can be made every interval
	 */
	constructor(interval: number, maxRequests: number) {
		this.interval = interval;
		this.maxRequests = maxRequests;
		this.remainingRequests = this.maxRequests;
		this.resetTimer = new ResetTimer(this);
	}
}

class ResetTimer {
	/** When the next reset should occur (in milliseconds since Unix epoch) */
	public targetTime: number;
	/** The timer that resets the interval limit */
	public timeout: NodeJS.Timer;
	/** The IntervalLimit this ResetTimer resets */
	private readonly intervalLimit: IntervalLimit;

	/**
	 * @param intervalLimit The IntervalLimit this timer is for
	 */
	constructor(intervalLimit: IntervalLimit) {
		this.intervalLimit = intervalLimit;
		this.targetTime = Date.now() + intervalLimit.interval * 1000;
		this.timeout = setTimeout(this.reset, intervalLimit.interval * 1000);
	}

	/**
	 * Sets how long until the next reset occurs. Resets will continue occurring each interval after this time.
	 * This does NOT affect how many requests are remaining until the reset occurs.
	 * @param delay How long until the next reset should occur (in seconds)
	 */
	public reschedule = (delay: number): void => {
		clearTimeout(this.timeout);
		this.targetTime = Date.now() + delay * 1000;
		this.timeout = setTimeout(this.reset, delay * 1000);
	}

	/**
	 * Refills all requests for this interval and schedules the next reset.
	 * This does NOT clear 'timeout', so it should only be called by the callback of 'timeout' or after clearing 'timeout'
	 */
	private reset = (): void => {
		this.intervalLimit.remainingRequests = this.intervalLimit.maxRequests;
		/* The target reset time may be less than 'interval' seconds away (since setTimeout may take longer than the specified time to execute its callback)
		The next reset time is recalculated every interval to prevent the time from drifting too far */
		const now: number = Date.now();
		const delay: number = (this.intervalLimit.interval * 1000) - (now - this.targetTime);
		this.targetTime = now + delay;
		this.timeout = setTimeout(this.reset, delay);
	}
}

/**
 * An error that is thrown if an API request is prevented or fails due to an exceeded rate limit
 */
export class RateLimitError {

}
