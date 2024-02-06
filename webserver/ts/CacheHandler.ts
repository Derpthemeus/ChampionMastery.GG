import Region from "./Region";
import NodeCache = require("node-cache");


export default class CacheHandler {
	private readonly cache = new NodeCache();

	/**
	 * Stores a value in the cache. This is asynchronous and there is no way to tell when it has completed
	 * @param key The cache key
	 * @param value The value to be associated with the key
	 * @param ttl How long to keep the item in the cache (in seconds)
	 */
	public store = (key: string, value: any, ttl: number): void => {
		this.cache.set(key, value, ttl, (err: any) => {
			if (err) {
				console.error("Error storing value in cache: ", err);
			}
		});
	}

	/**
	 * Retrieves a value from the cache
	 * @param key The cache key
	 * @async
	 * @returns The object from the cache that is associated with the specified key, or undefined if there is no value associated with the key
	 * @throws {any} Thrown if an error occurs when accessing the cache. This error will already be logged.
	 */
	public retrieve = (key: string): Promise<any> => {
		return new Promise<any>((resolve: Function, reject: Function) => {
			this.cache.get(key, (err: any, value: any) => {
				if (!err) {
					resolve(value);
				} else {
					console.error("Error retrieving value from cache: ", err);
					reject(err);
				}
			});
		});
	}


	/**
	 * Formats a cache key that is used to store a Summoner object with the player's Riot ID and region as the key
	 * @param region
	 * @param riotId An Riot ID.
	 * @returns A key that can be used to store/retrieve a Summoner object from the cache
	 */
	public makePlayerKey = (region: Region, riotId: string): string => {
		return `player/${region.id}:${riotId}`;
	}
}
