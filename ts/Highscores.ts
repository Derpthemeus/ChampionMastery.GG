import {BasicChampionMasteryInfo, BasicSummonerInfo, ChampionMasteryInfo, Highscore} from "./types";
import Region from "./Region";
import Config from "./Config";
import Champion from "./Champion";
import fs = require("fs");

export default class Highscores {
	/** Arrays of highscores (index 0 is first place) keyed by champion IDs */
	public readonly highscores: {[championId: string]: Highscore[]} = {};

	public constructor(highscores: {[championId: string]: Highscore[]}) {
		this.highscores = highscores;
	}

	/**
	 * Gives a summoner a highscore for specified champion at specified place
	 * @param champion The champion this score is for
	 * @param place The place in the highscores this summoner will be given (0 is first place)
	 * @param summoner The summoner who will hold this score
	 * @param region The summoner's region
	 * @param points How many points the summoner has on the champion
	 */
	public setScore = (champion: Champion, place: number, summoner: BasicSummonerInfo, region: Region, points: number): void => {
		const score: Highscore = {
			name: summoner.name,
			id: summoner.id,
			accountId: summoner.accountId,
			puuid: summoner.puuid,
			region: region.id,
			points: points,
			standardizedName: summoner.standardizedName
		};
		// Insert the new score into the list at the correct index
		this.highscores[champion.id].splice(place, 0, score);


		let previousPlace: number = -1;
		// If the player already held a score for this champion at a lower position, remove it
		for (let testPlace = place + 1; testPlace < this.highscores[champion.id].length; testPlace++) {
			/** The score being checked */
			const testScore: Highscore = this.highscores[champion.id][testPlace];
			if (testScore.id === summoner.id && testScore.region === region.id) {
				// Remove the previous score
				this.highscores[champion.id].splice(testPlace, 1);
				previousPlace = testPlace - 1;
				break;
			}
		}

		// Remove the lowest score from the list if the list is too long
		if (this.highscores[champion.id].length > Config.highscoreCount.track) {
			this.highscores[champion.id] = this.highscores[champion.id].slice(0, Config.highscoreCount.track);
		}

		if (Config.logHighscoreChanges) {
			if (previousPlace === -1) {
				console.log(`Added player to highscores. ${summoner.name} (${region.id}) now has ${points} points on ${champion.name} (highscore at index ${place})`);
			} else {
				console.log(`Moved player on highscores. ${summoner.name} (${region.id}) now has ${points} points on ${champion.name} (moved from highscore index ${previousPlace} to ${place})`);
			}
		}
	}

	/**
	 * If a summoner has enough points on a single champion, add them to the highscores (if they aren't already on it) or update their stats on the list (if they are already on it)
	 * @param championInfo
	 * @param summoner
	 * @param region
	 */
	public updateChampionHighscores = (championInfo: BasicChampionMasteryInfo, summoner: BasicSummonerInfo, region: Region): void => {
		const champion: Champion = Champion.getChampionById(championInfo.championId);
		if (!champion) {
			/* This will happen if a player is looked up after playing a new champion before static data is updated. This warning is just logged (instead
			of forcing static data to be updated) because DDragon sometimes takes a little bit to be updated, so an immediate update will not always
			solve the problem. Static data will be updated at the next regular check, and the issue will be resolved. */
			console.warn(`Attempted to update highscores for invalid champion ID: ${championInfo.championId}`);
			return;
		}

		// Find the place this summoner belongs in
		for (let place = 0; place < Config.highscoreCount.track; place++) {
			const score = this.highscores[champion.id][place];
			if (this.highscores[champion.id][place]) {
				if (score.id === summoner.id && score.region === region.id) {
					// Update player info if it has changed
					if (score.name !== summoner.name || score.points !== championInfo.championPoints) {
						// https://github.com/Derpthemeus/ChampionMasteryLookup/issues/8
						if (score.points > championInfo.championPoints) {
							console.warn(`${summoner.name} (${region.id}) has lost points on ${champion.name}. Currently holds highscore at index ${place}`);
						}

						this.highscores[champion.id][place] = {
							name: summoner.name,
							id: summoner.id,
							accountId: summoner.accountId,
							puuid: summoner.puuid,
							region: region.id,
							points: championInfo.championPoints,
							standardizedName: summoner.standardizedName
						};
						if (Config.logHighscoreUpdates) {
							console.log(`Updated info for ${summoner.name} (${region.id}). Summoner now has ${championInfo.championPoints} points on ${champion.name} (score at index ${place})`);
						}
					}
					break;
				} else {
					if (championInfo.championPoints > score.points) {
						this.setScore(champion, place, summoner, region, championInfo.championPoints);
						break;
					}
				}
			} else {
				// Create new score
				this.setScore(champion, place, summoner, region, championInfo.championPoints);
				break;
			}
		}
	}

	/**
	 * Updates highscores for all champions a player has played (including total)
	 * @param masteries The player's champion mastery scores
	 * @param summoner
	 * @param region
	 */
	public updateAllHighscores = (masteries: ChampionMasteryInfo[], summoner: BasicSummonerInfo, region: Region): void => {
		let totalPoints: number = 0;
		let totalLevel: number = 0;
		for (const championInfo of masteries) {
			totalPoints += championInfo.championPoints;
			totalLevel += championInfo.championLevel;
			this.updateChampionHighscores(championInfo, summoner, region);
		}
		// Update total points highscore
		this.updateChampionHighscores({
			championId: -1,
			championPoints: totalPoints
		}, summoner, region);

		// Update total level highscore
		this.updateChampionHighscores({
			championId: -2,
			championPoints: totalLevel
		}, summoner, region);
	}

	/**
	 * Saves highscores to a JSON file
	 */
	public saveHighscores = (): void => {
		fs.writeFile(Config.highscoreDataPath, JSON.stringify(this.highscores), (err: NodeJS.ErrnoException) => {
			if (err) {
				console.error("Error saving highscores: ", err);
			} else if (Config.logHighscoreUpdates) {
				console.log("Saved highscores");
			}
		});
	}

	/**
	 * Returns the highscore at a specified place for a champion
	 * @param championId The ID of the champion (as a string or number)
	 * @param place The index of the score in the highscores for the champion (0 is first place)
	 * @returns The highscore for the specified champion at the specified index
	 */
	public getHighscore = (championId: number | string, place: number): Highscore => {
		return this.highscores[championId][place];
	}

	/**
	 * Returns all the highscores for a champion (element at index 0 is first place)
	 * @param championId The ID of the champion (as a string or number)
	 * @returns The array of highscores for the specified champion
	 */
	public getChampionHighscores = (championId: number | string): Highscore[] => {
		return this.highscores[championId];
	}
}
