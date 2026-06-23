/* Bridges the CSS colour tokens and label text into the chart's JS config. */

/** Read the colour palette from colors.css so CSS stays the single source. */
export function readThemePalette() {
	const rootStyles = getComputedStyle(document.documentElement);
	const cssVar = (name) => rootStyles.getPropertyValue(name).trim();

	return {
		ink: cssVar("--ink"),
		inkSoft: cssVar("--ink-soft"),
		inkFaint: cssVar("--ink-faint"),
		line: cssVar("--line"),
		grid: cssVar("--grid"),
		axis: cssVar("--axis"),
		bestValue: cssVar("--bv"),
		bestValueDeep: cssVar("--bv-deep"),
		regression: cssVar("--ols"),
		regressionDeep: cssVar("--ols-deep"),
		leastCost: cssVar("--lc"),
		leastCostDeep: cssVar("--lc-deep"),
		sliderFill: cssVar("--slider-fill"),
		sliderSelectedFill: cssVar("--slider-selected-fill"),
		categoryColors: {
			30: cssVar("--t30"),
			90: cssVar("--t90"),
			long: cssVar("--tlong"),
			mix: cssVar("--tmix"),
		},
	};
}

/** Full legend labels per validity bucket, used for legend and series names. */
export const VALIDITY_BUCKET_LABELS = {
	30: "30-day",
	90: "60–90 day",
	long: "Annual (180–450 day)",
	mix: "Mixed validity",
};

/** Compact legend labels swapped in on narrow viewports to avoid wrapping. */
export const SHORT_LEGEND_LABELS = {
	"30-day": "30-day",
	"60–90 day": "60–90",
	"Annual (180–450 day)": "Annual",
	"Mixed validity": "Mixed",
	"Best value ★": "Best ★",
};

/** Series name for the highlighted best-value star marker. */
export const BEST_VALUE_SERIES_NAME = "Best value ★";
