export function getMinElement<T>(arr: T[], valueParser: (el: T) => number): T {
	let min = Infinity;
	let minEl: T = arr[0];

	for (const el of arr) {
		const val = valueParser(el);

		if (val < min) {
			min = val;
			minEl = el;
		}
	}

	return minEl;
}

export function getMaxElement<T>(arr: T[], valueParser: (el: T) => number): T {
	let max = -Infinity;
	let maxEl: T = arr[0];

	for (const el of arr) {
		const val = valueParser(el);

		if (val > max) {
			max = val;
			maxEl = el;
		}
	}

	return maxEl;
}