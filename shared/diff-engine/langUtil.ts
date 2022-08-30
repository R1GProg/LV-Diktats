export function charIsPunctuation(char: string): boolean {
	return (char !== undefined && char?.match(/[,.\?!";:\-—\(\)]/) !== null);
}

export function charIsWordDelimeter(char: string): boolean {
	return charIsPunctuation(char) || char === " " || char === "\n";
}

export function getWordBounds(text: string, startIndex: number): [number, number] {
	const bounds: [number, number] = [0, text.length];
	
	// Find closest word delimeters to the letter on the left and right
	for (let j = startIndex; j >= 0; j--) {
		if (charIsWordDelimeter(text[j])) {
			bounds[0] = j + 1;
			break;
		}
	}

	for (let j = startIndex; j < text.length; j++) {
		if (charIsWordDelimeter(text[j])) {
			bounds[1] = j;
			break;
		}
	}

	return bounds;
}
