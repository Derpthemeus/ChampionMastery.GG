document.addEventListener("DOMContentLoaded", () => {
	formatNumbers();

	// Update selected region
	const region = getURLParameter("region");
	if (region) {
		document.getElementById("region").value = region;
	}

	setupAds();
});

function formatNumbers() {
	const elements = document.querySelectorAll("[data-format-number]");
	for (const element of elements) {
		const number = parseInt(element.dataset.formatNumber, 10);
		element.innerHTML = "";
		element.appendChild(document.createTextNode(number.toLocaleString()));
	}
}

function getURLParameter(name) {
	const query = window.location.search.substr(1).split("&");
	for (const param of query) {
		const split = param.split("=");
		if (split[0] === name) {
			return split[1];
		}
	}
	return null;
}

function toggleNavbarLookupForm() {
	const navbar = document.getElementById("navbar");
	navbar.dataset.collapsed = (navbar.dataset.collapsed === "expanded") ? "collapsed" : "expanded";
}

/** Sets ad IDs for each ad unit based on the the window size */
function setupAds() {
	/** The ID of each ad unit mapped to the minimum screen width (in pixels) that it can be displayed on */
	const map = new Map();
	// 300x250 static unit
	map.set(300, "5b114e8846e0fb000159d590");
	// 728x90 static unit
	map.set(860, "5b11551946e0fb0001070f29");
	// 728x90 dynamic unit (728x90, 970x90)
	map.set(1140, "5b11552646e0fb00014b5266");

	let adIdToUse;
	for (const [minWidth, adId] of map.entries()) {
		if (window.innerWidth >= minWidth) {
			adIdToUse = adId;
		} else {
			break;
		}
	}

	for (const ad of document.querySelectorAll(".ad-header, .ad-footer")) {
		if (adIdToUse) {
			ad.dataset.id = adIdToUse;
		} else {
			// Remove the element if no ad units fit
			ad.parentElement.removeChild(ad);
		}
	}
}
