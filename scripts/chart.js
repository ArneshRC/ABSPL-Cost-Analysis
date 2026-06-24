/* Builds the cost-vs-speed ECharts scatter and exposes interaction handlers.
   `echarts` is provided as a global by the CDN script tag in index.html. */

import { formatRupees } from "./utils.js";
import {
	BEST_VALUE_SERIES_NAME,
	SHORT_LEGEND_LABELS,
	VALIDITY_BUCKET_LABELS,
} from "./theme.js";

const COST_AXIS_MAX = 7500;
const SPEED_AXIS_MAX = 1100;
const MOBILE_BREAKPOINT_PX = 560;

const MONO_FONT = "IBM Plex Mono";
const SANS_FONT = "IBM Plex Sans";

const STAR_SYMBOL_PATH =
	"path://M0,-50 L11.23,-15.45 L47.55,-15.45 L18.17,5.9 L29.39,40.45 " +
	"L0,19.1 L-29.39,40.45 L-18.17,5.9 L-47.55,-15.45 L-11.23,-15.45 Z";

/**
 * Create the chart and return handlers the controls layer can call.
 *
 * @param {object} args
 * @param {HTMLElement} args.chartElement  Container the chart renders into.
 * @param {object[]}    args.groups         Coordinate groups from analysis.
 * @param {object}      args.bestValuePlan  Cheapest-rate plan.
 * @param {object}      args.leastCostPlan  Cheapest monthly-cost plan.
 * @param {object}      args.regression     OLS fit summary.
 * @param {object}      args.frontier       Efficient-frontier vertices + knee.
 * @param {object}      args.theme          Colour palette from readThemePalette.
 */
export function createCostSpeedChart({
	chartElement,
	groups,
	bestValuePlan,
	leastCostPlan,
	regression,
	frontier,
	theme,
}) {
	const prefersReducedMotion = matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const chart = echarts.init(chartElement, null, { renderer: "canvas" });

	let isBestValueLineVisible = true;
	let isRegressionLineVisible = false;
	let isLeastCostLineVisible = true;
	let isFrontierVisible = false;

	function scatterPointsForBucket(validityBucket) {
		return groups
			.filter(
				(group) =>
					!group.containsBestValue && group.validityBucket === validityBucket,
			)
			.map((group) => ({
				value: [group.speedMbps, Math.round(group.costPerMonth)],
				plans: group.plans,
			}));
	}

	function makeScatterSeries(validityBucket) {
		const color = theme.categoryColors[validityBucket];
		return {
			name: VALIDITY_BUCKET_LABELS[validityBucket],
			type: "scatter",
			symbolSize: 13,
			data: scatterPointsForBucket(validityBucket),
			itemStyle: { color, opacity: 0.88, borderColor: "#fff", borderWidth: 1 },
			emphasis: {
				scale: 1.4,
				itemStyle: { opacity: 1, borderColor: color, borderWidth: 2 },
			},
		};
	}

	const bestValueLineSeries = buildBestValueLineSeries(bestValuePlan, theme);
	const regressionLineSeries = buildRegressionLineSeries(regression, theme);
	const leastCostLineSeries = buildLeastCostLineSeries(leastCostPlan, theme);
	const bestValueMarkerSeries = buildBestValueMarkerSeries(groups, theme);
	const frontierSeries = buildFrontierSeries(frontier, theme);

	function buildSeries() {
		const series = [
			makeScatterSeries("30"),
			makeScatterSeries("90"),
			makeScatterSeries("long"),
			makeScatterSeries("mix"),
			bestValueMarkerSeries,
		];
		if (isBestValueLineVisible) series.push(bestValueLineSeries);
		if (isRegressionLineVisible) series.push(regressionLineSeries);
		if (isLeastCostLineVisible) series.push(leastCostLineSeries);
		if (isFrontierVisible) series.push(...frontierSeries);
		return series;
	}

	/* Cheapest plan offering at least a given speed — the efficient-frontier
	   point at that speed. When a hovered plan costs more than this, it is
	   superseded by this cheaper, at-least-as-fast plan; the gap is Δ. */
	const allPlans = groups.flatMap((group) => group.plans);
	function cheapestPlanAtLeastSpeed(speedMbps) {
		return allPlans
			.filter((plan) => plan.speedMbps >= speedMbps)
			.reduce((cheapest, plan) =>
				plan.costPerMonth < cheapest.costPerMonth ? plan : cheapest,
			);
	}

	function formatTooltip(params) {
		if (!params.data?.plans) return "";
		const [speedMbps, costPerMonth] = params.data.value;
		const ratePerMbps = (costPerMonth / speedMbps).toFixed(2);
		const stackedPlans = params.data.plans;
		const supersededBy = cheapestPlanAtLeastSpeed(speedMbps);
		const frontierOverpay = costPerMonth - supersededBy.costPerMonth;
		const deltaText = `Δ = ${formatRupees(frontierOverpay)}/mo`;

		let subLine = `${formatRupees(costPerMonth)}/month (${deltaText})`;
		if (Math.round(frontierOverpay) > 0) {
			subLine +=
				`<span class="tt-sup">Superseded by: ${supersededBy.planName} ` +
				`(${supersededBy.speedMbps} Mbps, ${formatRupees(supersededBy.costPerMonth)}/mo)</span>`;
		}

		let html =
			`<div class="tt"><div class="tt-h"><span style="color:${theme.ink}">${speedMbps} Mbps</span>` +
			`<span>₹${ratePerMbps}/Mbps/mo</span></div>` +
			`<div class="tt-sub" style="color:${theme.leastCostDeep}">${subLine}</div>`;
		for (const plan of stackedPlans) {
			html +=
				`<div class="tt-row"><span class="nm">${plan.planName}</span>` +
				`<span class="vd">${plan.validityDays} days · ${formatRupees(plan.totalPriceRupees)}</span></div>`;
		}
		return `${html}</div>`;
	}

	const baseOption = {
		animation: !prefersReducedMotion,
		animationDuration: 520,
		animationEasing: "cubicOut",
		legend: {
			data: [
				VALIDITY_BUCKET_LABELS["30"],
				VALIDITY_BUCKET_LABELS["90"],
				VALIDITY_BUCKET_LABELS.long,
				VALIDITY_BUCKET_LABELS.mix,
				BEST_VALUE_SERIES_NAME,
			],
			icon: "circle",
			itemWidth: 10,
			itemHeight: 10,
			inactiveColor: theme.axis,
		},
		tooltip: {
			trigger: "item",
			confine: true,
			borderColor: theme.line,
			borderWidth: 1,
			backgroundColor: "#fff",
			padding: [12, 14],
			extraCssText:
				"box-shadow:0 8px 28px rgba(32,32,32,.13);border-radius:12px;",
			formatter: formatTooltip,
		},
		xAxis: {
			type: "value",
			name: "Speed (Mbps)  →",
			nameLocation: "middle",
			nameTextStyle: {
				fontFamily: MONO_FONT,
				fontSize: 12,
				color: theme.inkFaint,
			},
			min: 0,
			max: SPEED_AXIS_MAX,
			splitLine: { lineStyle: { color: theme.grid } },
			axisLine: { lineStyle: { color: theme.axis } },
			axisTick: { show: false },
			axisLabel: { fontFamily: MONO_FONT, fontSize: 11, color: theme.inkFaint },
		},
		yAxis: {
			type: "value",
			name: "Cost / month (₹)  →",
			nameLocation: "middle",
			nameTextStyle: {
				fontFamily: MONO_FONT,
				fontSize: 12,
				color: theme.inkFaint,
			},
			min: 0,
			max: COST_AXIS_MAX,
			splitLine: { lineStyle: { color: theme.grid } },
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				fontFamily: MONO_FONT,
				fontSize: 11,
				color: theme.inkFaint,
				formatter: (value) =>
					value >= 1000 ? `₹${value / 1000}k` : `₹${value}`,
			},
		},
		dataZoom: [
			{ type: "inside", xAxisIndex: 0, filterMode: "none" },
			{ type: "inside", yAxisIndex: 0, filterMode: "none" },
			{
				type: "slider",
				xAxisIndex: 0,
				filterMode: "none",
				borderColor: theme.line,
				fillerColor: theme.sliderFill,
				handleStyle: { color: theme.bestValue },
				moveHandleStyle: { color: theme.bestValue },
				dataBackground: {
					lineStyle: { color: theme.axis },
					areaStyle: { color: theme.grid },
				},
				selectedDataBackground: {
					lineStyle: { color: theme.bestValue },
					areaStyle: { color: theme.sliderSelectedFill },
				},
				textStyle: {
					fontFamily: MONO_FONT,
					fontSize: 10,
					color: theme.inkFaint,
				},
			},
		],
		series: buildSeries(),
	};
	chart.setOption(baseOption);

	function isMobileWidth() {
		return chart.getWidth() < MOBILE_BREAKPOINT_PX;
	}

	/* Reserve room so the legend never sits on the plot, and keep the zoom
	   slider clear of the x-axis title. Re-applied on every resize. */
	function responsiveLayoutOption() {
		const mobile = isMobileWidth();
		return {
			grid: {
				left: mobile ? 60 : 74,
				right: mobile ? 16 : 30,
				top: 45,
				bottom: 110
			},
			legend: {
				top: 0,
				left: 0,
				itemGap: mobile ? 11 : 18,
				formatter: mobile
					? (name) => SHORT_LEGEND_LABELS[name] || name
					: (name) => name,
				textStyle: {
					fontFamily: SANS_FONT,
					fontSize: mobile ? 11.5 : 12.5,
					color: theme.inkSoft,
				},
			},
			xAxis: { nameGap: mobile ? 30 : 38 },
			yAxis: { nameGap: mobile ? 44 : 56 },
			dataZoom: [{}, {}, { bottom: mobile ? 8 : 12, height: mobile ? 14 : 16 }],
		};
	}

	function applyResponsiveLayout() {
		chart.setOption(responsiveLayoutOption());
	}
	applyResponsiveLayout();

	function rerenderSeries() {
		chart.setOption({ series: buildSeries() }, { replaceMerge: ["series"] });
	}

	return {
		/** Toggle the best-value reference line; returns its new visibility. */
		toggleBestValueLine() {
			isBestValueLineVisible = !isBestValueLineVisible;
			rerenderSeries();
			return isBestValueLineVisible;
		},
		/** Toggle the OLS regression line; returns its new visibility. */
		toggleRegressionLine() {
			isRegressionLineVisible = !isRegressionLineVisible;
			rerenderSeries();
			return isRegressionLineVisible;
		},
		/** Toggle the least-cost (no speed factor) line; returns its new visibility. */
		toggleLeastCostLine() {
			isLeastCostLineVisible = !isLeastCostLineVisible;
			rerenderSeries();
			return isLeastCostLineVisible;
		},
		/** Toggle the efficient-frontier overlay; returns its new visibility. */
		toggleFrontier() {
			isFrontierVisible = !isFrontierVisible;
			rerenderSeries();
			return isFrontierVisible;
		},
		/** Restore all three dataZoom ranges to their full extent. */
		resetZoom() {
			for (const dataZoomIndex of [0, 1, 2]) {
				chart.dispatchAction({
					type: "dataZoom",
					dataZoomIndex,
					start: 0,
					end: 100,
				});
			}
		},
		/** Resize the canvas and re-reserve responsive spacing. */
		handleResize() {
			chart.resize();
			applyResponsiveLayout();
		},
	};
}

/** Highlighted star marker for the best-value plan's coordinate group. */
function buildBestValueMarkerSeries(groups, theme) {
	const bestValueGroup = groups.find((group) => group.containsBestValue);
	const data = bestValueGroup
		? [
				{
					value: [
						bestValueGroup.speedMbps,
						Math.round(bestValueGroup.costPerMonth),
					],
					plans: bestValueGroup.plans,
				},
			]
		: [];
	return {
		name: BEST_VALUE_SERIES_NAME,
		type: "scatter",
		symbol: STAR_SYMBOL_PATH,
		symbolSize: 22,
		data,
		itemStyle: {
			color: theme.bestValue,
			borderColor: "#fff",
			borderWidth: 1.5,
		},
		emphasis: {
			scale: 1.3,
			itemStyle: { borderColor: theme.bestValueDeep, borderWidth: 2 },
		},
		z: 6,
	};
}

/** Reference line from the origin through the best-value plan, clipped to axes. */
function buildBestValueLineSeries(bestValuePlan, theme) {
	const ratePerMbps = bestValuePlan.costPerMbpsPerMonth;
	let endX = SPEED_AXIS_MAX;
	let endY = ratePerMbps * SPEED_AXIS_MAX;
	if (endY > COST_AXIS_MAX) {
		endY = COST_AXIS_MAX;
		endX = COST_AXIS_MAX / ratePerMbps;
	}
	return {
		name: "__bestValueLine",
		type: "line",
		showSymbol: false,
		silent: true,
		data: [
			[0, 0],
			{
				value: [endX, endY],
				label: {
					show: true,
					formatter: "best value",
					position: "end",
					color: theme.bestValueDeep,
					fontFamily: MONO_FONT,
					fontSize: 11,
					offset: [-6, -10],
				},
			},
		],
		lineStyle: { color: theme.bestValue, width: 2.4 },
		z: 5,
	};
}

/** Horizontal line at the cheapest monthly cost — least cost, ignoring speed. */
function buildLeastCostLineSeries(leastCostPlan, theme) {
	const costPerMonth = Math.round(leastCostPlan.costPerMonth);
	return {
		name: "__leastCostLine",
		type: "line",
		showSymbol: false,
		silent: true,
		data: [
			[0, costPerMonth],
			{
				value: [SPEED_AXIS_MAX, costPerMonth],
				label: {
					show: true,
					formatter: "least cost",
					position: "end",
					color: theme.leastCostDeep,
					fontFamily: MONO_FONT,
					fontSize: 11,
					offset: [-8, -10],
				},
			},
		],
		lineStyle: { color: theme.leastCost, width: 2.4, type: [2, 4] },
		z: 3,
	};
}

/**
 * The efficient-frontier overlay: a polyline through the cheapest plan at each
 * speed tier, a tag on each segment with its marginal ₹-per-extra-Mbps, and a
 * ring around the knee (the last cheap tier before the price of speed cliffs).
 * Returned as separate series so they layer correctly over the scatter.
 */
function buildFrontierSeries(frontier, theme) {
	const { vertices, kneeIndex } = frontier;

	const lineSeries = {
		name: "__frontierLine",
		type: "line",
		showSymbol: true,
		symbol: "circle",
		symbolSize: 6,
		silent: true,
		data: vertices.map((vertex, index) => {
			const point = {
				value: [vertex.speedMbps, Math.round(vertex.costPerMonth)],
			};
			if (index === vertices.length - 1) {
				point.label = {
					show: true,
					formatter: "value frontier",
					position: "top",
					color: theme.frontierDeep,
					fontFamily: MONO_FONT,
					fontSize: 11,
					offset: [-12, -2],
				};
			}
			return point;
		}),
		lineStyle: { color: theme.frontier, width: 2.4 },
		itemStyle: { color: theme.frontier, borderColor: "#fff", borderWidth: 1 },
		z: 4,
	};

	const marginalLabelSeries = {
		name: "__frontierMarginal",
		type: "scatter",
		symbolSize: 0,
		silent: true,
		data: vertices.slice(1).map((vertex, index) => {
			const previous = vertices[index];
			return {
				value: [
					(previous.speedMbps + vertex.speedMbps) / 2,
					Math.round((previous.costPerMonth + vertex.costPerMonth) / 2),
				],
				label: { formatter: `+₹${vertex.marginalPerMbps.toFixed(2)}/Mbps` },
			};
		}),
		label: {
			show: true,
			position: "top",
			color: theme.frontierDeep,
			fontFamily: MONO_FONT,
			fontSize: 10,
			backgroundColor: "rgba(255,255,255,0.82)",
			padding: [2, 4],
			borderRadius: 4,
		},
		z: 7,
	};

	const knee = kneeIndex >= 0 ? vertices[kneeIndex] : null;
	const kneeSeries = {
		name: "__frontierKnee",
		type: "scatter",
		symbol: "circle",
		symbolSize: 15,
		silent: true,
		data: knee
			? [
					{
						value: [knee.speedMbps, Math.round(knee.costPerMonth)],
						label: {
							show: true,
							formatter: `knee · ${knee.speedMbps} Mbps`,
							position: "bottom",
							color: theme.frontierDeep,
							fontFamily: MONO_FONT,
							fontSize: 11,
							fontWeight: 600,
							offset: [0, 4],
						},
					},
				]
			: [],
		itemStyle: {
			color: "transparent",
			borderColor: theme.frontierDeep,
			borderWidth: 2.2,
		},
		z: 8,
	};

	return [lineSeries, marginalLabelSeries, kneeSeries];
}

/** OLS regression line clipped to the visible plot rectangle. */
function buildRegressionLineSeries(regression, theme) {
	let startX = 0;
	let startY = regression.intercept;
	let endX = SPEED_AXIS_MAX;
	let endY = regression.intercept + regression.slope * SPEED_AXIS_MAX;
	if (endY > COST_AXIS_MAX) {
		endY = COST_AXIS_MAX;
		endX = (COST_AXIS_MAX - regression.intercept) / regression.slope;
	}
	if (startY < 0) {
		startY = 0;
		startX = -regression.intercept / regression.slope;
	}
	return {
		name: "__regressionLine",
		type: "line",
		showSymbol: false,
		silent: true,
		data: [
			[startX, Math.round(startY)],
			{
				value: [endX, Math.round(endY)],
				label: {
					show: true,
					formatter: "OLS fit",
					position: "end",
					color: theme.regressionDeep,
					fontFamily: MONO_FONT,
					fontSize: 11,
					offset: [-2, -10],
				},
			},
		],
		lineStyle: { color: theme.regression, width: 2.4, type: [7, 5] },
		z: 4,
	};
}
