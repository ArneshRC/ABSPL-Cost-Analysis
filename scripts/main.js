import {
	computeEfficientFrontier,
	computeOlsRegression,
	derivePlanMetrics,
	groupOverlappingPlans,
} from "./analysis.js";
import { createCostSpeedChart } from "./chart.js";
import { wireControls } from "./controls.js";
import { renderSummary } from "./summary.js";
import { readThemePalette } from "./theme.js";

async function initialiseDashboard() {
	const response = await fetch("./data/data.json");
	const { updatedAt, rawPlans } = await response.json();

	const plans = derivePlanMetrics(rawPlans);
	const bestValuePlan = plans[0];
	const leastCostPlan = plans.reduce((cheapest, plan) =>
		plan.costPerMonth < cheapest.costPerMonth ? plan : cheapest,
	);
	const regression = computeOlsRegression(plans);
	const frontier = computeEfficientFrontier(plans);
	const groups = groupOverlappingPlans(plans, bestValuePlan);
	const theme = readThemePalette();

	renderSummary({ plans, updatedAt, bestValuePlan, leastCostPlan, regression });

	const chart = createCostSpeedChart({
		chartElement: document.getElementById("chart"),
		groups,
		bestValuePlan,
		leastCostPlan,
		regression,
		frontier,
		theme,
	});
	wireControls(chart);
}

initialiseDashboard();
