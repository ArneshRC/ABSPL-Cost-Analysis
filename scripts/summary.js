/* Populates the stat strip, the winner card and the method footer. */

import { formatRupees, el } from "./utils.js";

/**
 * Fill the surrounding text panels from the derived metrics.
 *
 * @param {object}   args
 * @param {object[]} args.plans          Normalised plan records (for the count and cost range).
 * @param {string}   args.updatedAt      ISO timestamp of the last data refresh.
 * @param {object}   args.bestValuePlan  Cheapest-rate plan after normalisation.
 * @param {object}   args.leastCostPlan  Plan with the lowest monthly cost.
 * @param {object}   args.regression     OLS fit summary with speed range.
 */
export function renderSummary({
	plans,
	updatedAt,
	bestValuePlan,
	leastCostPlan,
	regression,
}) {
	const bestRateText = `₹${bestValuePlan.costPerMbpsPerMonth.toFixed(2)}`;

	// stat strip
	const updated = new Date(updatedAt);
	document.getElementById("s-updated").replaceChildren(
		updated.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
		el("small", updated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })),
	);
	document.getElementById("s-count").textContent = plans.length;
	document.getElementById("ols-r2").textContent = regression.rSquared.toFixed(3);
	document.getElementById("s-range").replaceChildren(
		`${regression.minSpeed}–${regression.maxSpeed}`,
		el("small", "Mbps"),
	);
	const maxCostPerMonth = Math.max(...plans.map((plan) => plan.costPerMonth));
	document.getElementById("s-cost-range").replaceChildren(
		`${formatRupees(leastCostPlan.costPerMonth)}–${formatRupees(maxCostPerMonth)}`,
		el("small", "/month"),
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
		el("small", "/month"),
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
		el("small", "/Mbps/month"),
	);
}
