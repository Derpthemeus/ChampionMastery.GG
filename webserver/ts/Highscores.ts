import * as apiHandler from "./apiHandler";
import Champion from "./Champion";

export default class Highscores {
	public highscoresSummary: {[championId: string]: Highscore[]} = {};
	/** Arrays of highscores (index 0 is first place) keyed by champion IDs */
	public championHighscores: Map<number, Highscore[]> = new Map<number, Highscore[]>();

	public constructor() {
		this.refreshHighscoresSummary();
		this.refreshAllChampionHighscores();

		// FIXME make refresh interval configurable.
		// Refresh highscores summary at regular intervals.
		setInterval(() => {
			this.refreshHighscoresSummary();
		}, 1000 * 60);

		// FIXME make this interval configurable, and stagger refreshes for each champion.
		// Refresh champion highscores at regular intervals.
		setInterval(() => {
			this.refreshAllChampionHighscores();
		}, 1000 * 60);
	}

	private refreshHighscoresSummary = async () => {
		this.highscoresSummary = await apiHandler.getHighscoresSummary();
	}

	private refreshAllChampionHighscores = async () => {
		const promises: Promise<void>[] = [];
		for (const champion of Champion.CHAMPIONS.values()) {
			promises.push(this.refreshChampionHighscores(champion.id));
		}

		return Promise.all(promises);
	}

	private refreshChampionHighscores = async (championId: number) => {
		this.championHighscores.set(championId, await apiHandler.getChampionHighscores(championId));
	}
}

/**
 * A single highscores entry.
 */
export interface Highscore {
	/** Summoner name */
	name: string;
	/** The name of the summoner, all lowercase with spaces removed */
	standardizedName: string;
	/** The ID of the player's region. */
	region: string;
	/** How many mastery points the player has on the champion */
	points: number;
}
