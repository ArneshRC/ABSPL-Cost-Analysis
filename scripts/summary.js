/* Populates the stat strip, the winner card and the method footer. */

import { formatRupees, el } from "./utils.js";

/**
 * Fill the surrounding text panels from the derived metrics.
 *
 * @param {object}   args
 * @param {object[]} args.dataset       Original plan records (for the count).
 * @param {object}   args.bestValuePlan  Cheapest-rate plan after normalisation.
 * @param {object}   args.regression     OLS fit summary with speed range.
 */
export function renderSummary({ dataset, bestValuePlan, regression }) {
	const bestRateText = `₹${bestValuePlan.costPerMbpsPerMonth.toFixed(2)}`;

	document.getElementById("s-best").textContent = bestValuePlan.planName;
	document.getElementById("s-rate").replaceChildren(
		`${bestRateText} `,
		el("small", "/Mbps/month"),
	);
	document.getElementById("s-count").textContent = dataset.length;
	document.getElementById("s-range").replaceChildren(
		`${regression.minSpeed}–${regression.maxSpeed} `,
		el("small", "Mbps"),
	);

	document.getElementById("w-name").textContent = bestValuePlan.planName;
	document.getElementById("w-meta").replaceChildren(
		el("b", `${bestValuePlan.speedMbps} Mbps`),
		` · ${bestValuePlan.validityDays}-day validity · ` +
			`${formatRupees(bestValuePlan.totalPriceRupees)} total · ` +
			`${formatRupees(bestValuePlan.costPerMonth)}/month`,
	);
	document.getElementById("w-price").replaceChildren(
		bestRateText,
		el("small", "per Mbps · per month"),
	);

	document.getElementById("foot").replaceChildren(
		el("b", "Method."),
		" Cost normalised to a monthly basis: price ÷ (validity ÷ 30). " +
			"Raw value = cost per month ÷ speed, so the best plan minimises ₹ per Mbps per month and lies on the flattest line through the origin. " +
			`OLS fit: cost/month ≈ ₹${regression.slope.toFixed(2)}·speed + ₹${Math.round(regression.intercept)} ` +
			`(R² = ${regression.rSquared.toFixed(2)}), across all ${regression.planCount} plans. ` +
			"Colour encodes billing term; a point may stack several plans — hover to expand names and validities. " +
			"OTT bundles, data caps and other extras are ignored by design — this map ranks raw speed per rupee only.",
	);
}
