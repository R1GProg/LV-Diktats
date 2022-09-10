import { Bounds } from "./Mistake";

export function charIsPunctuation(char: string): boolean {
	return (char !== undefined && char?.match(/[,.\?!";:\-—\(\)]/) !== null);
}

export function charIsWordDelimeter(char: string): boolean {
	return charIsPunctuation(char) || char === " " || char === "\n";
}

export function getWordBounds(text: string, startIndex: number): Bounds {
	const bounds: Bounds = { start: 0, end: text.length };
	
	// Find closest word delimeters to the letter on the left and right
	for (let j = startIndex; j >= 0; j--) {
		if (charIsWordDelimeter(text[j])) {
			bounds.start = j + 1;
			break;
		}
	}

	for (let j = startIndex; j < text.length; j++) {
		if (charIsWordDelimeter(text[j])) {
			bounds.end = j;
			break;
		}
	}

	return bounds;
}
