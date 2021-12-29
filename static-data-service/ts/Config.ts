import path = require("path");

export default class Config {

	/** The IP address to listen on */
	public static readonly serverAddress: string = "0.0.0.0";
	/** The port to listen on */
	public static readonly serverPort: number = 8080;

	/** How often to update static data (in minutes) */
	public static readonly staticDataUpdateInterval: number = 60;

	public static readonly staticDataPath: string = path.join(__dirname, "..", "staticData");
}
