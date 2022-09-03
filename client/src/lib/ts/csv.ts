import Papa from "papaparse";

export function parseCSV(file: File, cb: (entry: any) => void) {
	// @ts-ignore
	Papa.parse(file, {
		worker: true,
		step: cb,
		header: true
	})
}
