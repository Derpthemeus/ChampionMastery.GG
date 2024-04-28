export default class Config {

	public static readonly announcement: {message: string, link: string} = {
		/** A message that should be displayed at the top of every page on the site. If set to a falsy value, no message will be displayed */
		message: process.env.ANNOUNCEMENT_MESSAGE,
		/** The URL the message should link to. If set to a falsy value, the message will not link to anything. Has no effect if no message is displayed */
		link: process.env.ANNOUNCEMENT_LINK
	};

	/**
	 * If errors from the API that are non-critical (not occurring during startup) and unexpected (e.g. does not include a 404 when looking up a summoner by name) should be logged.
	 * Does not log 429 errors caused by exceeded user rate limit
	 */
	public static readonly logApiErrors: boolean = true;

	/** The IP address to listen on */
	public static readonly serverAddress: string = "0.0.0.0";
	/** The port to listen on */
	public static readonly serverPort: number = 8080;

	/** How long responses from each API should be cached for (in seconds). */
	public static readonly cacheDurations: {summoner: number} = {
		/** Applies to /summonerScores. */
		summoner: 600
	};

	/** How often highscores should be fetched from the highscores service (in seconds), */
	public static readonly highscoresRefreshIntervals: {summary: number, champion: number} = {
		summary: 60,
		champion: 60
	};

	/** How often rank thresholds should be fetched from the highscores service (in seconds), */
	public static readonly rankThresholdsRefreshInterval = 180;

	/** How often to fetch champion list from static-data-service (in minutes). */
	public static readonly staticDataUpdateInterval: number = 5;

	/** The base URL of the highscores service (e.g. http://localhost:8181). */
	public static readonly highscoresServiceUrl = process.env.HIGHSCORES_SERVICE_URL;

	/** The base URL of the static data service (e.g. http://localhost:8080). */
	public static readonly publicDragonUrl = process.env.PUBLIC_DRAGON_URL;
	/** The base URL of the static data service (e.g. http://localhost:8080). */
	public static readonly internalDragonUrl = process.env.INTERNAL_DRAGON_URL;

	/** The base URL of the site (e.g. "http://localhost:8080"). */
	public static readonly siteUrl = process.env.SITE_URL;
}
