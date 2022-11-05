import { processString } from "../index";

test("All quotation marks should be normalised into \"", () => {
	const testString = "' and ` and ´ and < and > and “ and ” and ‘ and ’ and « and » and ‟ and ‹ and › and „ are all quotation marks!";
	const resultString = "\"and\" and \"and\" and \"and\" and \"and\" and \"and\" and \"and\" and \"and\" and \" are all quotation marks!"
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

test("Quotes should be de-duplicated", () => {
	const testString = "\" \"Blah,\" \" said Blah.";
	const resultString = "\"Blah,\" said Blah."
	expect(processString(testString)).toBe(resultString);
});

test("Quotes should be de-duplicated", () => {
	const testString = "\" \"Blah,\" \" said Blah: \" \"Blah.\" \"";
	const resultString = "\"Blah,\" said Blah: \"Blah.\""
	expect(processString(testString)).toBe(resultString);
});

test("Quotes should be de-duplicated", () => {
	const testString = "\" \"Blah...,\" \" said Blah: \" \"Blah.\" \"";
	const resultString = "\"Blah…,\" said Blah: \"Blah.\""
	expect(processString(testString)).toBe(resultString);
});

test("Quotes should be de-duplicated", () => {
	const testString = "\" \"Blah...,\" said Blah: \" \"Blah?\"\"";
	const resultString = "\"Blah…,\" said Blah: \"Blah?\""
	expect(processString(testString)).toBe(resultString);
});

test("Quotes should be de-duplicated", () => {
	const testString = "\"\"Blah,\"\" said Blah.";
	const resultString = "\"Blah,\" said Blah."
	expect(processString(testString)).toBe(resultString);
});

test("Quote followed by quote should not have its quotes de-duplicated", () => {
	const testString = "McBlah said: \"Blah!\" \"Blah,\" responded Blah.";
	const resultString = "McBlah said: \"Blah!\" \"Blah,\" responded Blah."
	expect(processString(testString)).toBe(resultString);
});

test("Makeshift bottom quote made with comas should be normalised to regular quote", () => {
	const testString = ",,Blah,\" said Blah.";
	const resultString = "\"Blah,\" said Blah."
	expect(processString(testString)).toBe(resultString);
});

test("Makeshift bottom quote made with comas should be normalised to regular quote", () => {
	const testString = "Blah exclaimed: ,,Blah!\"";
	const resultString = "Blah exclaimed: \"Blah!\""
	expect(processString(testString)).toBe(resultString);
});

test("Makeshift bottom quote made with comas should be normalised to regular quote", () => {
	const testString = "Blah exclaimed: , ,Blah!\"";
	const resultString = "Blah exclaimed: \"Blah!\""
	expect(processString(testString)).toBe(resultString);
});

test("Makeshift bottom quote made with comas should be normalised to regular quote", () => {
	const testString = "Blah exclaimed: , , Blah! \"";
	const resultString = "Blah exclaimed: \"Blah!\""
	expect(processString(testString)).toBe(resultString);
});

test("Makeshift bottom quote made with comas should be normalised to regular quote", () => {
	const testString = "Blah exclaimed: , , Blah!\"";
	const resultString = "Blah exclaimed: \"Blah!\""
	expect(processString(testString)).toBe(resultString);
});

test("Double coma typos should not be normalised to regular quote", () => {
	const testString = "Blah,, blah.";
	const resultString = "Blah, blah.";
	expect(processString(testString)).toBe(resultString);
});

test("Double coma typos should not be normalised to regular quote, even if the next sentence has a quote", () => {
	const testString = "Blah,, blah. Blah: \"Blah!\"";
	const resultString = "Blah, blah. Blah: \"Blah!\"";
	expect(processString(testString)).toBe(resultString);
});

test("Spaced quotes should be cleaned up", () => {
	const testString = "Blah: \" Blah! \"";
	const resultString = "Blah: \"Blah!\"";
	expect(processString(testString)).toBe(resultString);
});