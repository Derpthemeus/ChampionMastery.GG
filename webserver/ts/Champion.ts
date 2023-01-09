import {Localization} from "./Localization";

export class ChampionStaticData {
	/** The champion's numeric ID */
	public id: number;
	public unlocalizedName: string;
	public localizedNames: Map<string, string>;
	/** The filename of the icon (e.g. "Annie.png") */
	public icon: string;
	/** The location of the top of this champion's icon on the spritesheet (in pixels from the top). */
	public spritesheetY?: number;
}

export default class Champion extends ChampionStaticData {
	/** Champions mapped to their ID, in alphabetical order of their name (with "Total Level" and "Total Points" first) */
	public static CHAMPIONS: Map<number, Champion>;

	/**
	 * Gets the champion with the specified ID
	 * @param id
	 * @returns The champion with the specified ID, or 'undefined' if no champion with the specified ID exists
	 */
	public static getChampionById(id: number): Champion {
		return Champion.CHAMPIONS.get(id);
	}

	constructor(staticData: ChampionStaticData) {
		super();
		this.id = staticData.id;
		this.unlocalizedName = staticData.unlocalizedName;
		this.icon = staticData.icon;
		// TODO types for champions are totally fucked - staticData.localizedNames is an object, not a map
		this.localizedNames = new Map(Object.entries(staticData.localizedNames));
		this.spritesheetY = staticData.spritesheetY;
	}

	/** Returns localized name, defaulting to en_US if localization fails. */
	public getLocalizedName(localization: Localization): string {
		let localizedName = this.localizedNames.get(localization.LOCALE_CODE);
		if (!localizedName) {
			console.error(`Could not localize ${this.unlocalizedName} to ${localization.LOCALE_CODE}`);
			localizedName = this.unlocalizedName;
		}

		return localizedName;
	}
}
