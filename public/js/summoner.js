document.addEventListener("DOMContentLoaded", () => {
	const ths = document.getElementsByTagName("th");
	for (let i = 0; i < ths.length; i++) {
		ths[i].addEventListener("click", () => {
			// Everything is also secondary sorted by points
			sortChampions([i, 2]);
		});
	}

	// Primary sort by level, secondary sorted by points
	sortChampions([1, 2]);

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

/**
 * Sorts the rows in the table
 * @param {number[]} order Which columns to use to sort the rows. If there is a tie for the first column in the array, it will be resolved by using the next column
 */
function sortChampions(order) {
	/** The direction to sort data in. 1 indicates ascending order, -1 indicates descending order */
	let direction;
	const ths = document.getElementsByTagName("th");
	for (let i = 0; i < ths.length; i++) {
		const th = ths[i];
		if (i === order[0]) {
			// Switch the order if the table is currently being sorted by this column, or use the column's default ordering if it isn't
			const currentOrder = +th.dataset.sortingOrder;
			if (currentOrder) {
				direction = -currentOrder;
			} else {
				if (i === 0) {
					// Sorting by name defaults to ascending
					direction = 1;
				} else {
					// Everything else defaults to descending
					direction = -1;
				}
			}
			th.dataset.sortingOrder = direction;
		} else {
			// Mark that the table is no longer being sorted by this column
			th.dataset.sortingOrder = 0;
		}
	}

	/*
	 * HACKY CODE ALERT
	 * Array.sort() is not necessarily stable. To make sorting stable, the timestamp of the last time
	 * that the player played the champion is always used to resolve conflicts. Unless a player discovers
	 * how to play 2 champions simultaneously on the same account, these values will always be unique.
	 */
	order.push(4);

	const tbody = document.getElementById("tbody");
	const arr = Array.from(tbody.rows);
	arr.sort((a, b) => {
		for (const columnIndex of order) {
			const value = compareRows(a, b, columnIndex, direction);
			if (value !== 0) {
				return value;
			}
		}
		return 0;
	});

	for (const row of arr) {
		tbody.insertBefore(row, tbody.rows[0]);
	}
}

/**
 * A comparator for sorting 2 table rows
 * @param {HTMLTableRowElement} a
 * @param {HTMLTableRowElement} b
 * @param {number} columnIndex The index
 * @param {-1 | 1} direction The direction to sort rows in. 1 indicates ascending order, -1 indicates descending order
 * @returns -1 if `a` should come before `b`, 1 if `b` should come before `a`, or 0 if they are tied
 */
function compareRows(a, b, columnIndex, direction) {
	const aCol = a.cells[columnIndex];
	const bCol = b.cells[columnIndex];
	/* Determine a value for each column using these steps:
	 * Try to parse a number from the column's `data-value` attribute
	 * If the `data-value` attribute is undefined or not a valid number, try to parse the column's contents as a number
	 * If the column doesn't contain a valid number, use the column's contents as a string
	 */
	const aVal = +aCol.dataset.value || +aCol.innerText || aCol.innerText;
	const bVal = +bCol.dataset.value || +bCol.innerText || bCol.innerText;

	return aVal === bVal ? 0 : (aVal < bVal ? direction : -direction);
}
