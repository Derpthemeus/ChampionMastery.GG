import {Localization} from "./Localization";

// TODO support localization
export function ordinalize(val: number, locale: Localization) {
	const tensDigit = Math.floor((val % 100) / 10);
	if (tensDigit === 1) {
		return `${val}th`;
	}

	const onesDigit = val % 10;
	if (onesDigit === 1) {
		return `${val}st`;
	} else if (onesDigit === 2) {
		return `${val}nd`;
	} else if (onesDigit === 3) {
		return `${val}rd`;
	} else {
		return `${val}th`;
	}
}
