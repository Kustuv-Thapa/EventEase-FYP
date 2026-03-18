function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function assertFutureOrNow(date) {
  return date.getTime() >= Date.now() - 1000; // small leeway
}

module.exports = { toDate, assertFutureOrNow };