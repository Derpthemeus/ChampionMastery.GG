// Miscellaneous types that aren't big enough to warrant having their own file

export interface BasicSummonerInfo {
	/** Summoner ID */
	id: number;
	/** Summoner name */
	name: string;
	/** The name of the summoner, all lowercase with spaces removed */
	standardizedName: string;
}

/**
 * Based on a response from https://developer.riotgames.com/api-methods/#summoner-v3/GET_getBySummonerName
 */
export interface Summoner extends BasicSummonerInfo {
	profileIconId: number;
}

/**
 * A response from https://developer.riotgames.com/api-methods/#static-data-v3/GET_getChampionList
 */
export interface ChampionList {
	data: {
		[id: string]: {
			image: {
				/** The file name of the icon (e.g. "Annie.png") */
				full: string
			},
			id: number,
			name: string
		}
	};
	version: string;
}

/**
 * A single highscore entry
 */
export interface Highscore extends BasicSummonerInfo {
	/** The ID of the region of the player */
	region: string;
	/** How many mastery points the player has on the champion */
	points: number;
}

export interface BasicChampionMasteryInfo {
	championId: number;
	championPoints: number;
}

/**
 * Info for a single champion from a response from https://developer.riotgames.com/api-methods/#champion-mastery-v3/GET_getAllChampionMasteries
 */
export interface ChampionMasteryInfo extends BasicChampionMasteryInfo {
	chestGranted: boolean;
	championLevel: number;
	championPointsUntilNextLevel: number;
	championPointsSinceLastLevel: number;
	lastPlayTime: number;
	tokensEarned: number;
}

interface IntervalLimitConfig {
	interval: number;
	maxRequests: number;
}

export interface RateLimitsConfig {
	application: IntervalLimitConfig[];
	method: {
		championMastery: IntervalLimitConfig[],
		summoner: IntervalLimitConfig[]
	};
}

export interface Champion {
	id: number;
	name: string;
	/** The full icon path (e.g. https://ddragon.leagueoflegends.com/cdn/7.10.1/img/champion/Annie.png) */
	icon: string;
}

export interface Region {
	id: string;
	platformId: string;
}
