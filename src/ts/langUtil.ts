export function charIsPunctuation(char: string): boolean {
	return char && char.match(/[,.\?!";:\-—\(\)]/) !== null;
}

export function charIsWordDelimeter(char: string): boolean {
	return charIsPunctuation(char) || char === " " || char === "\n";
}
