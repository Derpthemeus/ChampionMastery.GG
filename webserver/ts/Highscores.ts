import * as apiHandler from "./apiHandler";
import Champion from "./Champion";
import Config from "./Config";
import {Highscore} from "./apiHandler";

export default class Highscores {
	public highscoresSummary: {[championId: string]: Highscore[]} = {};
	/** Arrays of highscores (index 0 is first place) keyed by champion IDs */
	public championHighscores: Map<number, Highscore[]> = new Map<number, Highscore[]>();

	public constructor() {
		this.refreshHighscoresSummary();
		this.refreshAllChampionHighscores();

		// Refresh highscores summary at regular intervals.
		setInterval(() => {
			this.refreshHighscoresSummary();
		}, 1000 * Config.highscoresRefreshIntervals.summary);

		// FIXME stagger refreshes for each champion.
		// Refresh champion highscores at regular intervals.
		setInterval(() => {
			this.refreshAllChampionHighscores();
		}, 1000 * Config.highscoresRefreshIntervals.champion);
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
