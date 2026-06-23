/* Wires the toggle/reset buttons and window resize to the chart handlers. */

/**
 * Connect DOM controls to a chart created by createCostSpeedChart.
 *
 * @param {ReturnType<import("./chart.js").createCostSpeedChart>} chart
 */
export function wireControls(chart) {
	const frontierToggle = document.getElementById("t-fr");
	const bestValueToggle = document.getElementById("t-bv");
	const leastCostToggle = document.getElementById("t-lc");
	const regressionToggle = document.getElementById("t-ols");
	const resetButton = document.getElementById("t-reset");

	frontierToggle.addEventListener("click", () => {
		const isVisible = chart.toggleFrontier();
		frontierToggle.classList.toggle("off", !isVisible);
	});

	bestValueToggle.addEventListener("click", () => {
		const isVisible = chart.toggleBestValueLine();
		bestValueToggle.classList.toggle("off", !isVisible);
	});

	leastCostToggle.addEventListener("click", () => {
		const isVisible = chart.toggleLeastCostLine();
		leastCostToggle.classList.toggle("off", !isVisible);
	});

	regressionToggle.addEventListener("click", () => {
		const isVisible = chart.toggleRegressionLine();
		regressionToggle.classList.toggle("off", !isVisible);
	});

	resetButton.addEventListener("click", () => chart.resetZoom());

	window.addEventListener("resize", () => chart.handleResize());
}
