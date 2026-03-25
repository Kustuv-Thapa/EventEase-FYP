const blacklist = new Set();

const add = (token) => blacklist.add(token);
const has = (token) => blacklist.has(token);

module.exports = { add, has };
