import { diff } from 'deep-diff';
import _ from 'lodash';

const capitalizeFirstLetter = string =>
	string.charAt(0).toUpperCase() + string.slice(1);

const toUnderscored = obj => {
	_.forEach(obj, (k, v) => {
		obj[k] = v
			.replace(/(?:^|\.?)([A-Z])/g, (x, y) => `_${y.toLowerCase()}`)
			.replace(/^_/, '');
	});
	
	return obj;
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

const diffToString = val => {
	if (typeof val === 'undefined' || val === null) {
		return '';
	}
	if (val === true) {
		return '1';
	}
	if (val === false) {
		return '0';
	}
	if (typeof val === 'string') {
		return val;
	}
	if (!Number.isNaN(Number(val))) {
		return `${String(val)}`;
	}
	if ((typeof val === 'undefined' ? 'undefined' : typeof val) === 'object') {
		return `${JSON.stringify(val)}`;
	}
	if (Array.isArray(val)) {
		return `${JSON.stringify(val)}`;
	}
	return '';
};

export default {
	capitalizeFirstLetter,
	toUnderscored,
	calcDelta,
	diffToString,
};