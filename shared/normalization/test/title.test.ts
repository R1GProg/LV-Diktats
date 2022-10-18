import { processString } from "../index";

test("Title should not be quotation marks", () => {
	const testString = "\"Krāsaina saule virs pelēkiem jumtiem\"";
	const resultString = "Krāsaina saule virs pelēkiem jumtiem";
	expect(processString(testString)).toBe(resultString);
});

test("If title is not in quotation marks, similar parts in the text should not be normalised instead", () => {
	const testString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem\n\"Krāsaina saule virs pelēkiem jumtiem\"";
	const resultString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem\n\"Krāsaina saule virs pelēkiem jumtiem\"";
	expect(processString(testString)).toBe(resultString);
});

test("Author Title should be Author\nTitle", () => {
	const testString = "Osvalds Zebris Krāsaina saule virs pelēkiem jumtiem";
	const resultString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem";
	expect(processString(testString)).toBe(resultString);
});

test("Author, Title should be Author\nTitle", () => {
	const testString = "Osvalds Zebris, Krāsaina saule virs pelēkiem jumtiem";
	const resultString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem";
	expect(processString(testString)).toBe(resultString);
});

test("Author - Title should be Author\nTitle", () => {
	const testString = "Osvalds Zebris - Krāsaina saule virs pelēkiem jumtiem";
	const resultString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem";
	expect(processString(testString)).toBe(resultString);
});

test("Author. Title should be Author\nTitle", () => {
	const testString = "Osvalds Zebris. Krāsaina saule virs pelēkiem jumtiem";
	const resultString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem";
	expect(processString(testString)).toBe(resultString);
});

test("Author.\nTitle should be Author\nTitle", () => {
	const testString = "Osvalds Zebris.\nKrāsaina saule virs pelēkiem jumtiem";
	const resultString = "Osvalds Zebris\nKrāsaina saule virs pelēkiem jumtiem";
	expect(processString(testString)).toBe(resultString);
});