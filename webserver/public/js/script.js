document.addEventListener("DOMContentLoaded", () => {
	formatNumbers();

	// Toggle navbar lookup form
	document.getElementById("toggle-search-button").addEventListener("click", () => {
		const navbar = document.getElementById("navbar");
		navbar.dataset.collapsed = (navbar.dataset.collapsed === "expanded") ? "collapsed" : "expanded";
	});

	// Update selected region
	const regionParam = getURLParameter("region");
	if (regionParam) {
		localStorage.setItem("region", regionParam);
	}
	const storedRegion = localStorage.getItem("region");
	if (storedRegion) {
		for (let element of document.getElementsByClassName("region")) {
			element.value = storedRegion;
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

	if (getURLParameter("beta") !== null) {
		console.log("Welcome to super secret beta mode :O");
		for (let element of document.getElementsByClassName("beta")) {
			element.style.display = "revert";
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
