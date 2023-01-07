document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("champion-filter").addEventListener("input", (event) => {
		const filterText = document.getElementById("champion-filter").value;

		const championNames = document.getElementsByClassName("champion-name");
		const champions = document.getElementsByClassName("champion");
		for (let i = 0; i < champions.length; i++) {
			// TODO use same matching behavior as champ select
			champions[i].style.display = championNames[i].textContent.toLowerCase().includes(filterText.toLowerCase()) ? "flex" : "none";
		}
	});
});
