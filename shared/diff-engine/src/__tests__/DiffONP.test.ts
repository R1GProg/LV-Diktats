import Diff from "..";
import DiffONP from "../DiffONP";

describe("DiffONP", () => {
	test("Correct diff for strings", () => {
		const checkText = "Test Hellw warld!";
		const correctText = "Hello world!";

		const diff = new DiffONP<string>(checkText.split(""), correctText.split(""));
		diff.calc();

		const expectedData = [
			{ type: "DEL", indexCheck: 0, indexCorrect: 0, item: "T" },
			{ type: "DEL", indexCheck: 1, indexCorrect: 0, item: "e" },
			{ type: "DEL", indexCheck: 2, indexCorrect: 0, item: "s" },
			{ type: "DEL", indexCheck: 3, indexCorrect: 0, item: "t" },
			{ type: "DEL", indexCheck: 4, indexCorrect: 0, item: " " },
			{ type: "DEL", indexCheck: 9, indexCorrect: 4, item: "w" },
			{ type: "ADD", indexCheck: 10, indexCorrect: 4, item: "o" },
			{ type: "DEL", indexCheck: 12, indexCorrect: 7, item: "a" },
			{ type: "ADD", indexCheck: 13, indexCorrect: 7, item: "o" }
		];

		expect(diff.getSequence()).toStrictEqual(expectedData);
		expect(diff.getDistance()).toBe(expectedData.length);
	});

	test("Correct diff for arbitrary data type", () => {
		type DataItem = { a: number, b: number };

		const checkData: DataItem[] = [{ a: 1, b: 2 }, { a: 2, b: 3 }, { a: 2, b: 5 }, { a: 2, b: 9 }];
		const correctData: DataItem[] = [{ a: 5, b: 1 }, { a: 2, b: 3 }, { a: 2, b: 5 }];
		const predicate = (a: DataItem, b: DataItem) => {
			return a.a === b.a && a.b === b.b;
		};

		const diff = new DiffONP(checkData, correctData, predicate);
		diff.calc();

		const expectedData = [
			{ type: "DEL", indexCheck: 0, indexCorrect: 0, item: { a: 1, b: 2 } },
			{ type: "ADD", indexCheck: 1, indexCorrect: 0, item: { a: 5, b: 1 } },
			{ type: "DEL", indexCheck: 3, indexCorrect: 3, item: { a: 2, b: 9 } }
		];

		expect(diff.getSequence()).toStrictEqual(expectedData);
		expect(diff.getDistance()).toBe(expectedData.length);
	});

	test("Correct diff with DiffONP instance reuse", () => {
		const checkText = "Woah";
		const correctText = "Arbitrary";

		const diff = new DiffONP<string>(checkText.split(""), correctText.split(""));
		diff.calc();

		const checkText1 = "Test Hellw warld!";
		const correctText1 = "Hello world!";

		diff.setData(checkText1.split(""), correctText1.split(""));
		diff.calc();

		const expectedData = [
			{ type: "DEL", indexCheck: 0, indexCorrect: 0, item: "T" },
			{ type: "DEL", indexCheck: 1, indexCorrect: 0, item: "e" },
			{ type: "DEL", indexCheck: 2, indexCorrect: 0, item: "s" },
			{ type: "DEL", indexCheck: 3, indexCorrect: 0, item: "t" },
			{ type: "DEL", indexCheck: 4, indexCorrect: 0, item: " " },
			{ type: "DEL", indexCheck: 9, indexCorrect: 4, item: "w" },
			{ type: "ADD", indexCheck: 10, indexCorrect: 4, item: "o" },
			{ type: "DEL", indexCheck: 12, indexCorrect: 7, item: "a" },
			{ type: "ADD", indexCheck: 13, indexCorrect: 7, item: "o" }
		];

		expect(diff.getSequence()).toStrictEqual(expectedData);
		expect(diff.getDistance()).toBe(expectedData.length);
	});
});