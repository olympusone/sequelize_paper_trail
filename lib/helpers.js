const capitalizeFirstLetter = string =>
	string.charAt(0).toUpperCase() + string.slice(1);

const toUnderscored = obj => {
	for (const [k, v] of Object.entries(obj)) {
		obj[k] = v
			.replace(/(?:^|\.?)([A-Z])/g, (x, y) => `_${y.toLowerCase()}`)
			.replace(/^_/, '');
	}

	return obj;
};

const calcObject = (changedKeys, next) => {
	const DEBUG = false;

	if (DEBUG) {
		console.log('next', next);
	}

	return changedKeys.map(c => {
		return {
			[c]: next[c]
		}
	})
};

const calcDelta = (changedKeys, current, next) => {
	const DEBUG = false;

	if (DEBUG) {
		console.log('current', current);
		console.log('next', next);
	}

	return changedKeys.map(c => {
		return {
			[c]: [current[c], next[c]]
		}
	})
};

export default {
	capitalizeFirstLetter,
	toUnderscored,
	calcObject,
	calcDelta,
};