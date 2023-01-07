document.addEventListener("DOMContentLoaded", () => {
	formatNumbers();

	// Update selected region
	const region = getURLParameter("region");
	if (region) {
		for (let element of document.getElementsByClassName("region")) {
			element.value = region;
		}

		for (let element of document.getElementsByClassName("regionableLink")) {
			let separator = element.href.includes("?") ? "&" : "?";
			element.href += `${separator}region=${region}`;
		}
	}
});

// TODO set a language cookie if lang header is set (and consider the cookie when determining best locale)

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
