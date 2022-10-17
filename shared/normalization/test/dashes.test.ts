import { processString } from "../index";

test("Processed string should not contain regular dashes", () => {
	const testString = "Test - test";
	expect(processString(testString)).not.toContain('-');
});

test("Processed string should not contain en-dashes", () => {
	const testString = "Test – test";
	expect(processString(testString)).not.toContain('–');
});

test("Processed string should contain em-dashes", () => {
	const testString = "Test — test";
	expect(processString(testString)).toContain('—');
});

test("Adding spaces in front of dashes", () => {
	const testString = "Test— test";
	const resultString = "Test — test";
	expect(processString(testString)).toBe(resultString);
});

test("Adding spaces after dashes", () => {
	const testString = "Test —test";
	const resultString = "Test — test";
	expect(processString(testString)).toBe(resultString);
});