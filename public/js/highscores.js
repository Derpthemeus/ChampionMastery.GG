document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("quickJump").addEventListener("change", (event) => {
		if (event.target.value !== "quick_jump") {
			window.location.href = "/champion?champion=" + event.target.value;
		}
	});
});
