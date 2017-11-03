// Sorts based on the "data-value" attribute
$.tablesorter.addParser({
	id: "data-value",
	is: (s) => {
		return false;
	},
	format: (string, table, cell) => {
		return $(cell).data("value");
	},
	type: "numeric"
});

$(document).ready(() => {
	// Set up tablesorter
	$("#table").tablesorter({
		sortRestart: true,
		sortInitialOrder: "desc",
		headers: {
			0: {sortInitialOrder: "asc"},
			2: {sorter: "data-value"},
			3: {sorter: "data-value"},
			4: {sorter: "data-value"},
			5: {sorter: "data-value"},
			6: {sorter: "data-value"}
		},
		// Primary sorted by level, secondary sorted by points
		sortList: [
			[1, 1],
			[2, 1]
		]
	});

	// Set last played tooltips
	const elements = document.getElementsByClassName("lastPlayed");
	const now = new moment();
	for (const td of elements) {
		const relative = new moment(td.dataset.formatTime, "x").from(now);
		td.title = relative;
	}

	// Format times
	formatTimes();
});

function formatTimes() {
	const elements = document.querySelectorAll("[data-format-time]");
	for (const element of elements) {
		const time = new moment(element.dataset.formatTime, "x");
		element.innerHTML = "";
		element.appendChild(document.createTextNode(time.format("D MMM YYYY, h:mm a")));
	}
}
