/* Small presentation and DOM helpers shared across modules. */

/** Format a rupee amount with Indian digit grouping, rounded to whole rupees. */
export function formatRupees(amount) {
	return `₹${parseInt(Math.round(amount)).toLocaleString("en-IN")}`;
}

/** Convert a validity window in days into an equivalent number of 30-day months. */
export function validityDaysToMonths(validityDays) {
	return validityDays / 30;
}

/**
 * Create an element, optionally setting its text content.
 *
 * @param {string} tag    Tag name to create.
 * @param {string} [text] Text placed inside the element.
 * @returns {HTMLElement}
 */
export function el(tag, text) {
	const node = document.createElement(tag);
	if (text !== undefined) node.textContent = text;
	return node;
}
