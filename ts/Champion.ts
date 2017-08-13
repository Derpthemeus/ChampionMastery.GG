export default class Champion {
	/** Champions mapped to their ID, in alphabetical order of their name (with "Total Level" and "Total Points" first) */
	public static CHAMPIONS: Map<number, Champion>;

	/** The champion's numeric ID */
	public id: number;
	public name: string;
	/** The filename of the icon (e.g. "Annie.png") */
	public icon: string;

	/**
	 * Gets the champion with the specified ID
	 * @param id
	 * @returns The champion with the specified ID, or 'undefined' if no champion with the specified ID exists
	 */
	public static getChampionById(id: number): Champion {
		return Champion.CHAMPIONS.get(id);
	}
}
