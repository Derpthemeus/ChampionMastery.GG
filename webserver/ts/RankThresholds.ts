import * as apiHandler from "./apiHandler";
import {ordinalize} from "./utils";
import {Localization} from "./Localization";
import Config from "./Config";
import {highscores} from "./server";
import Highscores from "./Highscores";

export default class RankThresholds {
	// Each champion contains a map of points -> rank.
	private topEntries = new Map<number, Map<number, number>>();
	private rankThresholds = new Map<number, RankThreshold[]>();

	public constructor() {
		this.refreshThresholds();

		setInterval(() => {
			this.refreshThresholds();
		}, 1000 * Config.rankThresholdsRefreshInterval);
	}

	public getRank(championId: number, points: number): number {
		// The first time a player is discovered and added to the top 50, this will only show them as being in the
		// top 100 (until scores are refreshed from the highscores service again).
		if (this.topEntries.get(championId).has(points)) {
			return this.topEntries.get(championId).get(points);
		} else {
			if (this.rankThresholds.has(championId)) {
				for (const threshold of this.rankThresholds.get(championId)) {
					if (points >= threshold.masteryPoints) {
						return threshold.rank;
					}
				}
			}
		}

		return 0;
	}

	public static localizeRank(rank: number, localization: Localization): string {
		if (!rank) {
			return "";
		}

		if (rank <= Highscores.CHAMPION_HIGHSCORES_LENGTH) {
			return ordinalize(rank, localization);
		} else {
			if (rank >= 1000000) {
				return `${rank / 1000000}m+`;
			} else if (rank >= 1000) {
				return `${rank / 1000}k+`;
			} else {
				return `${rank}+`;
			}
		}
	}

	public refreshTopEntries(): void {
		for (const [championId, scores] of 	highscores.championHighscores) {
			const champTopEntries = new Map<number, number>();
			for (let i = 0; i < scores.length; i++) {
				champTopEntries.set(scores[i].points, i + 1);
			}
			this.topEntries.set(championId, champTopEntries);
		}
	}

	private refreshThresholds = async () => {
		this.rankThresholds = await apiHandler.getRankThresholds();
	}
}

export interface RankThreshold {
	championId: number;
	masteryPoints: number;
	rank: number;
}
