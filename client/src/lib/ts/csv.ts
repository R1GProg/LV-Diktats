import Papa from "papaparse";

export function parseCSV(
	file: File,
	step: (entry: any) => void,
	complete?: () => void,
	error?: () => void
) {
	// @ts-ignore
	Papa.parse(file, {
		worker: true,
		step,
		complete,
		error,
		header: true
	})
}

export function parseCSVPromise(file: File, step: (entry: any) => void) {
	return new Promise<void>((res, rej) => {
		parseCSV(file, step, res, rej);
	});
}
