/**
 * Format a non-negative number as a Nepali Rupee string.
 *
 * @param {number} value - Non-negative numeric value
 * @returns {string} e.g. "NPR 1,000.00"
 */
export function formatNPR(value) {
  return (
    "NPR " +
    Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
