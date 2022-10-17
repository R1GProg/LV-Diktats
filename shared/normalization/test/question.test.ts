import { processString } from "../index";

test("Question marks should be followed with a space", () => {
	const testString = "Test?Test.";
	const resultString = "Test? Test."
	expect(processString(testString)).toBe(resultString);
});

test("Question marks with a space after them should be left intact", () => {
	const testString = "Test? Test.";
	const resultString = "Test? Test."
	expect(processString(testString)).toBe(resultString);
});

test("Question marks at the end of quotes should be left intact", () => {
	const testString = "\"Test?\" Test.";
	const resultString = "\"Test?\" Test."
	expect(processString(testString)).toBe(resultString);
});

test("Question marks followed by a quotation mark should not have a space added, even if there is an another quote later on", () => {
	const testString = "\"Test?\" test. \"Test!\"";
	const resultString = "\"Test?\" test. \"Test!\""
	expect(processString(testString)).toBe(resultString);
});

test("Exclamation marks followed by the start of a quote should be spaced", () => {
	const testString = "Test?\"test\"";
	const resultString = "Test? \"test\""
	expect(processString(testString)).toBe(resultString);
});