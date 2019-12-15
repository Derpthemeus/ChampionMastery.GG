export default class Region {
	public id: string;
	public platformId: string;

	/** Regions mapped to their ID */
	public static REGIONS: Map<string, Region> = new Map<string, Region>([
		["NA", new Region("NA", "NA1")],
		["EUW", new Region("EUW", "EUW1")],
		["EUNE", new Region("EUNE", "EUN1")],
		["BR", new Region("BR", "BR1")],
		["OCE", new Region("OCE", "OC1")],
		["KR", new Region("KR", "KR")],
		["TR", new Region("TR", "TR1")],
		["LAS", new Region("LAS", "LA2")],
		["LAN", new Region("LAN", "LA1")],
		["RU", new Region("RU", "RU")],
		["JP", new Region("JP", "JP1")]
	]);

	private constructor(id: string, platformId: string) {
		this.id = id;
		this.platformId = platformId;
	}
}
