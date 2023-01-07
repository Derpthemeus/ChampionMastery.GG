// TODO add support for localizing champion names
import express = require("express");
import locale = require("locale");
import VError = require("verror");

const en_US = require("../locales/en_US.json");
const SPONGE = require("../locales/SPONGE.json");

const localeMapping = new Map<string, Localization>([
	["en_US", en_US],
	["en", en_US],
	["sponge", SPONGE]
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


export type Localization = {};
