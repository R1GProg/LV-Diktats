import Papa from "papaparse";

export function parseCSV(file: File) {
	// @ts-ignore
	Papa.parse(file, {
		worker: true,
		step: (result) => {
			console.log(result);
		}
	})
}
