export default spec => Object.freeze({
	...spec,
	_keyOf: a => (a => a !== null ? a[0] : null)(Object.entries(spec).find(([_, v]) => v === a))
});
