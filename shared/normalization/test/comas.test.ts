import { processString } from "../index";

test("Comas should have a space after them", () => {
	const testString = "Test,test";
	const resultString = "Test, test"
	expect(processString(testString)).toBe(resultString);
});

test("Comas with a space after them should not have an another space added", () => {
	const testString = "Test, test";
	const resultString = "Test, test"
	expect(processString(testString)).toBe(resultString);
});

test("Comas followed by a quotation mark should not have a space added", () => {
	const testString = "\"Test,\" test";
	const resultString = "\"Test,\" test"
	expect(processString(testString)).toBe(resultString);
});

test("Comas followed by a quotation mark should not have a space added, even if there is an another quote later on", () => {
	const testString = "\"Test,\" test. \"Test!\"";
	const resultString = "\"Test,\" test. \"Test!\""
	expect(processString(testString)).toBe(resultString);
});

test("Comas followed by the start of a quote should be spaced", () => {
	const testString = "Test,\"test\"";
	const resultString = "Test, \"test\""
	expect(processString(testString)).toBe(resultString);
});

test("Double comas not intended as quotation mark should be normalised into one", () => {
	const testString = "Test,, test!";
	const resultString = "Test, test!"
	expect(processString(testString)).toBe(resultString);
});

test("Double comas intended as quotation mark should not be normalised into one", () => {
	const testString = "Test: ,,test!\"";
	const resultString = "Test: \"test!\""
	expect(processString(testString)).toBe(resultString);
});