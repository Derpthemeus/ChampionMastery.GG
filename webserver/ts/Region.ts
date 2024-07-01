export default class Region {
	public id: string;
	public platformId: string;

	/** A list of all regions. */
	public static REGIONS: Region[] = [
		new Region("NA", "NA1"),
		new Region("EUW", "EUW1"),
		new Region("EUNE", "EUN1"),
		new Region("BR", "BR1"),
		new Region("OCE", "OC1"),
		new Region("KR", "KR"),
		new Region("TR", "TR1"),
		new Region("LAS", "LA2"),
		new Region("LAN", "LA1"),
		new Region("RU", "RU"),
		new Region("JP", "JP1"),
		new Region("VN", "VN2"),
		new Region("PH", "PH2"),
		new Region("SG", "SG2"),
		new Region("TW", "TW2"),
		new Region("TH", "TH2"),
		new Region("MENA", "ME1")
	];

	/** Regions mapped to their region ID. */
	private static regionsByRegionId: Map<string, Region> = new Map<string, Region>(
		Region.REGIONS.map((region) => {
			return [region.id, region] as [string, Region];
		})
	);

	/** Regions mapped to their platform ID. */
	private static regionsByPlatformId: Map<string, Region> = new Map<string, Region>(
		Region.REGIONS.map((region) => {
			return [region.platformId, region] as [string, Region];
		})
	);

	private constructor(id: string, platformId: string) {
		this.id = id;
		this.platformId = platformId;
	}

	public static getByRegionId(regionId: string): Region {
		return Region.regionsByRegionId.get(regionId);
	}

	public static getByPlatformId(platformId: string): Region {
		return Region.regionsByPlatformId.get(platformId);
	}
}
