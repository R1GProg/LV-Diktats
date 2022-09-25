import { logger } from "..";

// Contains helper functions to ensure that data formats are valid.

export function tryParseJSON<T>(json: string): T | null {
	try {
		const parse: T = JSON.parse(json);
		return parse;
	} catch (e) {
		return null;
	}
}