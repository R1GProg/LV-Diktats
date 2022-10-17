import { processString } from "../index";

test("All quotation marks should be normalised into \"", () => {
	const testString = "'`´<>“”‘’«»‟‹›„";
	const resultString = "\"\"\"\"\"\"\"\"\"\"\"\"\"\"\""
	expect(processString(testString)).toBe(resultString);
});

test("Quotation marks should be spaced", () => {
	const testString = "\"Test\"\"Test\"";
	const resultString = "\"Test\" \"Test\""
	expect(processString(testString)).toBe(resultString);
});

test("Already spaced quotation marks should not be spaced", () => {
	const testString = "\"Test\" \"Test\"";
	const resultString = "\"Test\" \"Test\""
	expect(processString(testString)).toBe(resultString);
});

test("Text after quotes should be spaced apart from the quote", () => {
	const testString = "\"Test?\"Test.";
	const resultString = "\"Test?\" Test."
	expect(processString(testString)).toBe(resultString);
});

test("Text after beginning quote should not be spaced", () => {
	const testString = "\"Test?\"";
	const resultString = "\"Test?\""
	expect(processString(testString)).toBe(resultString);
});