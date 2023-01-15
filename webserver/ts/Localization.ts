/*
Steps to add a new localization:
- Verify the language is listed in https://ddragon.leagueoflegends.com/cdn/languages.json
- Add the new locale file to ../locales and ../../static-data-service/locales
- Update `supportedLocales` in staticDataUpdater.ts
- Add the language to `localeMapping`
- Update `supportedLocales`
 */
import express = require("express");
import locale = require("locale");
import VError = require("verror");

const en_US = require("../locales/en_US.json");
const sponge = require("../locales/sponge.json");
const vn_VN = require("../locales/vn_VN.json");
const ko_KR = require("../locales/ko_KR.json");

/** Officially supported locales (excludes spongecase). */
export const SUPPORTED_LOCALES: Localization[] = [en_US, vn_VN, ko_KR];

const localeMapping = new Map<string, Localization>([
	["en_US", en_US],
	["en", en_US],
	["sponge", sponge],
	["vn_VN", vn_VN],
	["vn", vn_VN],
	["kr", ko_KR],
	["ko_KR", ko_KR]
]);
const locales = new locale.Locales(Array.from(localeMapping.keys()), "en_US");

export function getLocalization(req: express.Request) : Localization {
	const acceptedLocales: string[] = [];
	if (typeof req.query.lang === "string") {
		acceptedLocales.push(req.query.lang);
	}
	if (req.header("accept-language")) {
		acceptedLocales.push(req.header("accept-language"));
	}

	const best = new locale.Locales(acceptedLocales, "en_US").best(locales);
	const localization = localeMapping.get(best.normalized);
	if (!localization) {
		throw new VError("Could not find locale for lang param '%s' and accept-language header '%s'", req.query.lang, req.header("accept-language"));
	}

	return localization;
}


export type Localization = {
	LOCALE_CODE: string;
	LANGUAGE_NAME: string;
	"Help & Info": string;
	"Legal info": string;
	"Player privacy": string;
	"Contact": string;
	"Champion name": string;
	"champions": string;
	"Summoner name": string;
	"Region": string;
	"Highscores": string;
	"Error": string;
	"Summoner X not found in region Y": string;
	"Try again later": string;
	"Double check the summoner name and region, then try again later": string;
	"Mastery points": string;
	"Points": string;
	"Points until next level": string;
	"Total points": string;
	"Level": string;
	"Total level": string;
	"Progress": string;
	"Chest": string;
	"Last played": string;
	"Rank": string;
	"HIDDEN": string;
	"Nobody": string;
	"Mastered": string;
	"tokens": string;
	"League of Legends": string;
	"champion mastery highscores": string;
	"and player lookup": string;
	"champion mastery scores for X": string;
};
