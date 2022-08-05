export function charIsPunctuation(char: string): boolean {
	return char.match(/[,.\?!";:-—\(\)]/) !== null;
}
