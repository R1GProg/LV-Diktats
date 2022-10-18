import { processString } from "../index";

test("Exclamation marks should be followed by a space", () => {
	const testString = "Test!Test.";
	const resultString = "Test! Test."
	expect(processString(testString)).toBe(resultString);
});

test("Sxclamation marks already followed by a space should not have an extra space appended to it", () => {
	const testString = "Test! Test.";
	const resultString = "Test! Test."
	expect(processString(testString)).toBe(resultString);
});

test("Exclamation marks at the end of quotes should be left intact", () => {
	const testString = "\"Test!\" Test.";
	const resultString = "\"Test!\" Test."
	expect(processString(testString)).toBe(resultString);
});

test("Exclamation marks followed by a quotation mark should not have a space added, even if there is an another quote later on", () => {
	const testString = "\"Test!\" test. \"Test!\"";
	const resultString = "\"Test!\" test. \"Test!\""
	expect(processString(testString)).toBe(resultString);
});

test("Exclamation marks followed by the start of a quote should be spaced", () => {
	const testString = "Test!\"test\"";
	const resultString = "Test! \"test\""
	expect(processString(testString)).toBe(resultString);
});