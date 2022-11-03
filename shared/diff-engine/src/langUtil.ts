export function charIsPunctuation(char: string): boolean {
	return (char !== undefined && char?.match(/[,.\?!";:\-—\(\)…]/) !== null);
}

export function charIsWordDelimeter(char: string): boolean {
	return charIsPunctuation(char) || char.match(/^\s$/g) !== null || char === "\n";
}
