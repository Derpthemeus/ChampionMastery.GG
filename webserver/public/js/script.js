document.addEventListener("DOMContentLoaded", () => {
	formatNumbers();

	// Toggle navbar lookup form
	document.getElementById("toggle-search-button").addEventListener("click", () => {
		const navbar = document.getElementById("navbar");
		navbar.dataset.collapsed = (navbar.dataset.collapsed === "expanded") ? "collapsed" : "expanded";
	});

	// Update selected region
	const region = getURLParameter("region");
	if (region) {
		for (let element of document.getElementsByClassName("region")) {
			element.value = region;
		}

		for (let element of document.getElementsByClassName("internalLink")) {
			if (!element.href.includes("region=")) {
				element.href += `${element.href.includes("?") ? "&" : "?"}region=${region}`;
			}
		}
	}

	const lang = getURLParameter("lang");
	if (lang) {
		for (let element of document.getElementsByClassName("internalLink")) {
			if (!element.href.includes("lang=")) {
				element.href += `${element.href.includes("?") ? "&" : "?"}lang=${lang}`;
			}
		}
	}
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
