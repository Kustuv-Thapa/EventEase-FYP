/**
 * Zero-fill a sparse MongoDB aggregation result to produce one entry per
 * calendar day in the requested window.
 *
 * @param {Array<{_id: string, [valueKey]: number}>} aggregationResult
 *   Raw aggregation output where `_id` is a "YYYY-MM-DD" date string.
 * @param {number} windowDays  - Number of calendar days to fill (7 | 30 | 90)
 * @param {string} valueKey    - The field name for the metric value (e.g. "count" or "amount")
 * @returns {Array<{date: string, [valueKey]: number}>} Exactly windowDays entries, oldest first
 */
function zeroFill(aggregationResult, windowDays, valueKey) {
  const map = new Map(aggregationResult.map((r) => [r._id, r[valueKey]]));
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    result.push({ date: key, [valueKey]: map.get(key) ?? 0 });
  }
  return result;
}

module.exports = { zeroFill };
