import { processString } from "../index";

test("Spaces after newline should be trimmed", () => {
	const testString = "\n   ";
	const resultString = "\n"
	expect(processString(testString)).toBe(resultString);
});

test("Tabs after newline should be trimmed", () => {
	const testString = "\n		";
	const resultString = "\n"
	expect(processString(testString)).toBe(resultString);
});

test("Spaces before newline should be trimmed", () => {
	const testString = "   \n";
	const resultString = "\n"
	expect(processString(testString)).toBe(resultString);
});

test("Tabs before newline should be trimmed", () => {
	const testString = "		\n";
	const resultString = "\n"
	expect(processString(testString)).toBe(resultString);
});

test("Excess newlines should be trimmed", () => {
	const testString = "Test\n\nTest";
	const resultString = "Test\nTest"
	expect(processString(testString)).toBe(resultString);
});

test("CRLN should be converted to LN", () => {
	const testString = "Test\r\nTest";
	const resultString = "Test\nTest"
	expect(processString(testString)).toBe(resultString);
});

test("Spaces should be trimmed", () => {
	const testString = "Test   Test";
	const resultString = "Test Test"
	expect(processString(testString)).toBe(resultString);
});