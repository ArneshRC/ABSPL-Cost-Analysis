/* Populates the stat strip, the winner card and the method footer. */

import { formatRupees, el } from "./utils.js";

/**
 * Fill the surrounding text panels from the derived metrics.
 *
 * @param {object}   args
 * @param {object[]} args.dataset        Original plan records (for the count).
 * @param {object}   args.bestValuePlan  Cheapest-rate plan after normalisation.
 * @param {object}   args.leastCostPlan  Plan with the lowest monthly cost.
 * @param {object}   args.regression     OLS fit summary with speed range.
 */
export function renderSummary({
	dataset,
	bestValuePlan,
	leastCostPlan,
	regression,
}) {
	const bestRateText = `₹${bestValuePlan.costPerMbpsPerMonth.toFixed(2)}`;

	// stat strip
	document.getElementById("s-lc-name").textContent = leastCostPlan.planName;
	document.getElementById("s-lc-cost").replaceChildren(
		`${formatRupees(leastCostPlan.costPerMonth)} `,
		el("small", "/month"),
	);
	document.getElementById("s-bv-name").textContent = bestValuePlan.planName;
	document.getElementById("s-bv-rate").replaceChildren(
		`${bestRateText} `,
		el("small", "/Mbps/month"),
	);
	document.getElementById("s-count").textContent = dataset.length;
	document.getElementById("s-range").replaceChildren(
		`${regression.minSpeed}–${regression.maxSpeed} `,
		el("small", "Mbps"),
	);

	// least-cost winner tile
	document.getElementById("wlc-name").textContent = leastCostPlan.planName;
	document.getElementById("wlc-meta").replaceChildren(
		el("b", `${leastCostPlan.speedMbps} Mbps`),
		` · ${leastCostPlan.validityDays}-day validity · ` +
			`${formatRupees(leastCostPlan.totalPriceRupees)} total · ` +
			`₹${leastCostPlan.costPerMbpsPerMonth.toFixed(2)}/Mbps/month`,
	);
	document.getElementById("wlc-price").replaceChildren(
		formatRupees(leastCostPlan.costPerMonth),
		el("small", "per month"),
	);

	// best-value winner tile
	document.getElementById("wbv-name").textContent = bestValuePlan.planName;
	document.getElementById("wbv-meta").replaceChildren(
		el("b", `${bestValuePlan.speedMbps} Mbps`),
		` · ${bestValuePlan.validityDays}-day validity · ` +
			`${formatRupees(bestValuePlan.totalPriceRupees)} total · ` +
			`${formatRupees(bestValuePlan.costPerMonth)}/month`,
	);
	document.getElementById("wbv-price").replaceChildren(
		bestRateText,
		el("small", "per Mbps · per month"),
	);
}
