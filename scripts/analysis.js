/* Pure data transforms: normalise plans, fit a regression, and group overlaps. */

import { validityDaysToMonths } from "./utils.js";

/**
 * Normalise each raw plan onto a per-month basis and a per-Mbps-per-month rate,
 * then sort cheapest-rate-first so the best-value plan is index 0.
 */
export function derivePlanMetrics(dataset) {
	return dataset
		.map((rawPlan) => {
			const costPerMonth =
				rawPlan.totalPriceRupees / validityDaysToMonths(rawPlan.validityDays);
			return {
				planName: rawPlan.planName,
				speedMbps: rawPlan.speedMbps,
				validityDays: rawPlan.validityDays,
				totalPriceRupees: rawPlan.totalPriceRupees,
				costPerMonth,
				costPerMbpsPerMonth: costPerMonth / rawPlan.speedMbps,
			};
		})
		.sort((a, b) => a.costPerMbpsPerMonth - b.costPerMbpsPerMonth);
}

/** Ordinary-least-squares fit of monthly cost against speed across all plans. */
export function computeOlsRegression(plans) {
	const speeds = plans.map((plan) => plan.speedMbps);
	const monthlyCosts = plans.map((plan) => plan.costPerMonth);
	const planCount = plans.length;

	const meanSpeed = speeds.reduce((sum, value) => sum + value, 0) / planCount;
	const meanCost =
		monthlyCosts.reduce((sum, value) => sum + value, 0) / planCount;

	let speedVarianceSum = 0;
	let speedCostCovarianceSum = 0;
	let costVarianceSum = 0;
	for (let index = 0; index < planCount; index++) {
		const speedDeviation = speeds[index] - meanSpeed;
		const costDeviation = monthlyCosts[index] - meanCost;
		speedVarianceSum += speedDeviation * speedDeviation;
		speedCostCovarianceSum += speedDeviation * costDeviation;
		costVarianceSum += costDeviation * costDeviation;
	}

	const slope = speedCostCovarianceSum / speedVarianceSum;
	const intercept = meanCost - slope * meanSpeed;
	const rSquared =
		(speedCostCovarianceSum * speedCostCovarianceSum) /
		(speedVarianceSum * costVarianceSum);

	return {
		slope,
		intercept,
		rSquared,
		planCount,
		minSpeed: Math.min(...speeds),
		maxSpeed: Math.max(...speeds),
	};
}

/**
 * Lower-left envelope of the cost-vs-speed cloud: the cheapest plan at each
 * speed that nothing faster-or-equal undercuts. Returns vertices sorted slow→
 * fast, each annotated with the marginal cost (₹ per extra Mbps) of the step
 * that reaches it, plus the knee — the vertex after which that marginal cost
 * spikes hardest (the last cheap tier before the price of speed cliffs).
 */
export function computeEfficientFrontier(plans) {
	const undominated = plans.filter(
		(plan) =>
			!plans.some(
				(other) =>
					other !== plan &&
					other.speedMbps >= plan.speedMbps &&
					other.costPerMonth <= plan.costPerMonth &&
					(other.speedMbps > plan.speedMbps ||
						other.costPerMonth < plan.costPerMonth),
			),
	);

	// One vertex per speed (dominance already dropped pricier ties), slow→fast.
	const cheapestBySpeed = new Map();
	for (const plan of undominated) {
		if (!cheapestBySpeed.has(plan.speedMbps)) {
			cheapestBySpeed.set(plan.speedMbps, plan);
		}
	}
	const vertices = [...cheapestBySpeed.values()]
		.sort((a, b) => a.speedMbps - b.speedMbps)
		.map((plan) => ({
			planName: plan.planName,
			speedMbps: plan.speedMbps,
			costPerMonth: plan.costPerMonth,
			marginalPerMbps: null,
		}));

	for (let index = 1; index < vertices.length; index++) {
		const deltaCost =
			vertices[index].costPerMonth - vertices[index - 1].costPerMonth;
		const deltaSpeed =
			vertices[index].speedMbps - vertices[index - 1].speedMbps;
		vertices[index].marginalPerMbps = deltaCost / deltaSpeed;
	}

	// Knee: interior vertex where the next step's marginal cost jumps most above
	// the step that reached it.
	let kneeIndex = -1;
	let largestJump = -Infinity;
	for (let index = 1; index < vertices.length - 1; index++) {
		const jump =
			vertices[index + 1].marginalPerMbps - vertices[index].marginalPerMbps;
		if (jump > largestJump) {
			largestJump = jump;
			kneeIndex = index;
		}
	}

	return { vertices, kneeIndex };
}

/** Classify a validity window into a billing-term bucket key. */
function validityBucketKey(validityDays) {
	if (validityDays === 30) return "30";
	return validityDays <= 90 ? "90" : "long";
}

/**
 * Collapse plans that land on the same (speed, monthly-cost) coordinate into one
 * marker, recording the validity bucket and whether the best-value plan is here.
 */
export function groupOverlappingPlans(plans, bestValuePlan) {
	const groupsByCoordinate = new Map();

	for (const plan of plans) {
		const coordinateKey = `${plan.speedMbps}|${plan.costPerMonth.toFixed(3)}`;
		if (!groupsByCoordinate.has(coordinateKey)) {
			groupsByCoordinate.set(coordinateKey, {
				speedMbps: plan.speedMbps,
				costPerMonth: plan.costPerMonth,
				plans: [],
			});
		}
		groupsByCoordinate.get(coordinateKey).plans.push(plan);
	}

	const groups = [...groupsByCoordinate.values()];
	for (const group of groups) {
		const bucketKeys = new Set(
			group.plans.map((plan) => validityBucketKey(plan.validityDays)),
		);
		group.isMixedValidity = bucketKeys.size > 1;
		group.validityBucket = group.isMixedValidity ? "mix" : [...bucketKeys][0];
		group.containsBestValue = group.plans.some(
			(plan) => plan.planName === bestValuePlan.planName,
		);
	}

	return groups;
}
