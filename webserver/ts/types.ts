// Miscellaneous types that aren't big enough to warrant having their own file

export interface BasicSummonerInfo {
	/** Encrypted summoner ID */
	id: string;
	/** Encrypted account ID */
	accountId: string;
	/** Encrypted PUUID */
	puuid: string;
	/** Summoner name */
	name: string;
	/** The name of the summoner, all lowercase with spaces removed */
	standardizedName: string;
}

/**
 * Based on a response from https://developer.riotgames.com/api-methods/#summoner-v4/GET_getBySummonerName
 */
export interface Summoner extends BasicSummonerInfo {
	profileIconId: number;
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
 * Info for a single champion from a response from https://developer.riotgames.com/api-methods/#champion-mastery-v4/GET_getAllChampionMasteries
 */
export interface ChampionMasteryInfo extends BasicChampionMasteryInfo {
	chestGranted: boolean;
	championLevel: number;
	championPointsUntilNextLevel: number;
	championPointsSinceLastLevel: number;
	lastPlayTime: number;
	tokensEarned: number;
}
