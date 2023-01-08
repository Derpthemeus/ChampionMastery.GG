import Champion, {ChampionStaticData} from "./Champion";
import Config from "./Config";
import VError = require("verror");
import fetch = require("node-fetch");

/**
 * Fetches the champion list from static-data-service.
 * @async
 * @throws {Error} Thrown if an error occurs while updating data. If this happens, the old champion list will continue
 * to be used (if it was successfully fetched previously).
 */
export const updateStaticData = async (): Promise<void> => {
	return new Promise<void>(async (resolve: Function, reject: Function) => {
		console.log("Updating champion list...");

		try {
			const url: string = `${Config.internalDragonUrl}/getChampions`;
			const response = await fetch.default(url);
			if (response.status !== 200) {
				reject(new VError("%s", `Received ${response.status} status code from static-data-service. Response body: ${response.body}`));
				return;
			}

			const championList: [number, ChampionStaticData][] = await response.json() as [number, ChampionStaticData][];
			Champion.CHAMPIONS = new Map(championList.map((pair) => {
				return [pair[0], new Champion(pair[1])];
			}));

			console.log(`Updated champion list with ${Champion.CHAMPIONS.size} champions from static-data-service.`);
		} catch (ex) {
			reject(new VError(ex, "%s", "Error updating static data"));
			return;
		}

		resolve();
	});
};
