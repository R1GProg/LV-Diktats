import { processString } from "../index";

test("Triple ellipses should be converted to …", () => {
	const testString = "Test...";
	const resultString = "Test…"
	expect(processString(testString)).toBe(resultString);
});

test("Double ellipses should be converted to …", () => {
	const testString = "Test..";
	const resultString = "Test…"
	expect(processString(testString)).toBe(resultString);
});

test("Triple ellipses with space in-between should be converted to …", () => {
	const testString = "Test. . .";
	const resultString = "Test…"
	expect(processString(testString)).toBe(resultString);
});

test("Spaces should be followed by ellipses", () => {
	const testString = "Test.Test";
	const resultString = "Test. Test"
	expect(processString(testString)).toBe(resultString);
});

test("Ellipses with a space after the should not be modified", () => {
	const testString = "Test. Test";
	const resultString = "Test. Test"
	expect(processString(testString)).toBe(resultString);
});

test("Ellipses at the end of quotes should be left intact", () => {
	const testString = "\"Test.\" Test";
	const resultString = "\"Test.\" Test"
	expect(processString(testString)).toBe(resultString);
});

test("Ellipses followed by a quotation mark should not have a space added, even if there is an another quote later on", () => {
	const testString = "\"Test.\" test. \"Test!\"";
	const resultString = "\"Test.\" test. \"Test!\""
	expect(processString(testString)).toBe(resultString);
});

test("Ellipses followed by the start of a quote should be spaced", () => {
	const testString = "Test.\"test\"";
	const resultString = "Test. \"test\""
	expect(processString(testString)).toBe(resultString);
});

test("Ellipses ending sentence should have spaces in front of them removed", () => {
	const testString = "Test .";
	const resultString = "Test."
	expect(processString(testString)).toBe(resultString);
});

test("Triple ellipses ending sentence should have spaces in front of them removed", () => {
	const testString = "Test …";
	const resultString = "Test…"
	expect(processString(testString)).toBe(resultString);
});