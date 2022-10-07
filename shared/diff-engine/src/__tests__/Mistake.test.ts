import { Action } from '../Action';
import { Mistake, MistakeData } from "../Mistake";

function getMistakeInstanceBasicData(mistake: Mistake) {
	return {
		actions: mistake.actions,
		type: mistake.type,
		subtype: mistake.subtype,
		boundsCheck: mistake.boundsCheck,
		boundsCorrect: mistake.boundsCorrect,
		boundsDiff: mistake.boundsDiff,
		word: mistake.word,
		wordCorrect: mistake.wordCorrect
	}
}

describe("Mistake", () => {
	/*
	--- Data handling ---
	*/

	test("Export Mistake data", async () => {
		const mistake = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Hello",
		});

		const output = await mistake.exportData();
		const expectedData = {
			id: mistake.id,
			hash: await mistake.genHash(),
			type: "ADD",
			subtype: "WORD",
			actions: [],
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Hello",
			wordCorrect: undefined,
			children: await Promise.all(mistake.children.map((m) => m.exportData())),
			mergedId: null,
		};

		expect(output).toStrictEqual(expectedData);
	});

	test("Create Mistake from data", async () => {
		const inputData: MistakeData = {
			id: "82acf64c-41f0-4da5-9ae0-3a59f59c529c",
			hash: "2065474d45bc2726",
			type: "ADD",
			subtype: "WORD",
			actions: [],
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Hello",
			wordCorrect: undefined,
			children: [],
			mergedId: null
		};

		const mistake = Mistake.fromData(inputData);
		const parsedData = {
			id: mistake.id,
			hash: await mistake.genHash(),
			type: mistake.type,
			subtype: mistake.subtype,
			actions: mistake.actions,
			boundsCheck: mistake.boundsCheck,
			boundsCorrect: mistake.boundsCorrect,
			boundsDiff: mistake.boundsDiff,
			word: mistake.word,
			wordCorrect: mistake.wordCorrect,
			children: mistake.children,
			mergedId: mistake.mergedId
		}

		expect(parsedData).toStrictEqual(inputData);
	});

	/*
	--- Merging ---
	*/

	test("Merge unmerged mistakes (type=ADD)", () => {
		const mistakes = [
			new Mistake({
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 0, end: 5 },
				boundsCorrect: { start: 0, end: 7 },
				boundsDiff: { start: 2, end: 6 },
				word: "Hello",
			}),
			new Mistake({
				actions: [],
				type: "ADD",
				subtype: "OTHER",
				boundsCheck: { start: 5, end: 6 },
				boundsCorrect: { start: 5, end: 6 },
				boundsDiff: { start: 5, end: 6 },
				word: " ",
			}),
			new Mistake({
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 6, end: 11 },
				boundsCorrect: { start: 6, end: 11 },
				boundsDiff: { start: 6, end: 11 },
				word: "World",
			}),
		];

		const merged = Mistake.mergeMistakes(...mistakes);
		const expectedData = {
			actions: [],
			type: "ADD",
			subtype: "MERGED",
			boundsCheck: { start: 0, end: 11 },
			boundsCorrect: { start: 0, end: 11 },
			boundsDiff: { start: 2, end: 11 },
			word: "Hello.. ..World",
			wordCorrect: "Hello.. ..World",
		};

		const mergedData = getMistakeInstanceBasicData(merged);

		expect(mergedData).toStrictEqual(expectedData);
		expect(merged.children.filter((c) => c.mergedId !== merged.id).length).toBe(0);
	});

	test("Merge unmerged mistakes (type=DEL)", () => {
		const mistakes = [
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 0, end: 5 },
				boundsCorrect: { start: 0, end: 7 },
				boundsDiff: { start: 2, end: 6 },
				word: "Hello",
			}),
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "OTHER",
				boundsCheck: { start: 5, end: 6 },
				boundsCorrect: { start: 5, end: 6 },
				boundsDiff: { start: 5, end: 6 },
				word: " ",
			}),
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 6, end: 11 },
				boundsCorrect: { start: 6, end: 11 },
				boundsDiff: { start: 6, end: 11 },
				word: "World",
			}),
		];

		const merged = Mistake.mergeMistakes(...mistakes);
		const expectedData = {
			actions: [],
			type: "DEL",
			subtype: "MERGED",
			boundsCheck: { start: 0, end: 11 },
			boundsCorrect: { start: 0, end: 11 },
			boundsDiff: { start: 2, end: 11 },
			word: "Hello.. ..World",
			wordCorrect: "",
		};

		const mergedData = getMistakeInstanceBasicData(merged);

		expect(mergedData).toStrictEqual(expectedData);
		expect(merged.children.filter((c) => c.mergedId !== merged.id).length).toBe(0);
	});

	test("Merge unmerged mistakes (type=MIXED)", async () => {
		const mistakes = [
			new Mistake({
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 0, end: 5 },
				boundsCorrect: { start: 0, end: 7 },
				boundsDiff: { start: 2, end: 6 },
				word: "Hello",
			}),
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "OTHER",
				boundsCheck: { start: 5, end: 6 },
				boundsCorrect: { start: 5, end: 6 },
				boundsDiff: { start: 5, end: 6 },
				word: " ",
			}),
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 6, end: 11 },
				boundsCorrect: { start: 6, end: 11 },
				boundsDiff: { start: 6, end: 11 },
				word: "World",
			}),
		];

		const merged = Mistake.mergeMistakes(...mistakes);
		const expectedData = {
			actions: [],
			type: "MIXED",
			subtype: "MERGED",
			boundsCheck: { start: 5, end: 11 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 11 },
			word: "Hello.. ..World",
			wordCorrect: "Hello",
		};

		const mergedData = getMistakeInstanceBasicData(merged);

		expect(mergedData).toStrictEqual(expectedData);
		expect(merged.children.filter((c) => c.mergedId !== merged.id).length).toBe(0);
	});

	test("Merge already merged mistakes", () => {
		const mergedMistakeData: MistakeData = {
			id: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e",
			hash: "63366dd0dbf9e97c",
			type: "MIXED",
			subtype: "MERGED",
			actions: [],
			boundsCheck: { start: 5, end: 11 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 11 },
			word: "Hello.. ..World",
			wordCorrect: "Hello",
			children: [
			  	{
					id: "dc97283d-9700-4620-a188-b710ec3c957a",
					hash: "2065474d45bc2726",
					type: "ADD",
					subtype: "WORD",
					actions: [],
					boundsCheck: { start: 0, end: 5 },
					boundsCorrect: { start: 0, end: 7 },
					boundsDiff: { start: 2, end: 6 },
					word: "Hello",
					wordCorrect: undefined,
					children: [],
					mergedId: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e"
			  	},
			  	{
					id: "802199c0-6fb3-47cd-a374-46eb402102ae",
					hash: "a2b354d070611fee",
					type: "DEL",
					subtype: "OTHER",
					actions: [],
					boundsCheck: { start: 5, end: 6 },
					boundsCorrect: { start: 5, end: 6 },
					boundsDiff: { start: 5, end: 6 },
					word: " ",
					wordCorrect: undefined,
					children: [],
					mergedId: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e"
			  	},
			  	{
					id: "eb196a14-7dc3-4577-84e6-8d98c8f0bc5a",
					hash: "16372b1f53852cdf",
					type: "DEL",
					subtype: "WORD",
					actions: [],
					boundsCheck: { start: 6, end: 11 },
					boundsCorrect: { start: 6, end: 11 },
					boundsDiff: { start: 6, end: 11 },
					word: "World",
					wordCorrect: undefined,
					children: [],
					mergedId: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e"
			  	}
			],
			mergedId: null
		};
		const mergedMistake0 = Mistake.fromData(mergedMistakeData);
		const mistake1 = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 11, end: 15 },
			boundsCorrect: { start: 8, end: 12 },
			boundsDiff: { start: 11, end: 15 },
			word: "Test",
		});
		const merged = Mistake.mergeMistakes(mergedMistake0, mistake1);
		const mergedData = getMistakeInstanceBasicData(merged);
		const expectedData = {
			actions: [],
			type: "MIXED",
			subtype: "MERGED",
			boundsCheck: { start: 5, end: 11 },
			boundsCorrect: { start: 0, end: 12 },
			boundsDiff: { start: 2, end: 15 },
			word: "Hello.. ..World..Test",
			wordCorrect: "Hello..Test"
		};

		expect(mergedData).toStrictEqual(expectedData);
		expect(merged.children.filter((c) => c.mergedId !== merged.id).length).toBe(0);
	});

	test("Unmerge mistakes", () => {
		const mergedMistakeData: MistakeData = {
			id: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e",
			hash: "63366dd0dbf9e97c",
			type: "MIXED",
			subtype: "MERGED",
			actions: [],
			boundsCheck: { start: 5, end: 11 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 11 },
			word: "Hello.. ..World",
			wordCorrect: "Hello",
			children: [
			  	{
					id: "dc97283d-9700-4620-a188-b710ec3c957a",
					hash: "2065474d45bc2726",
					type: "ADD",
					subtype: "WORD",
					actions: [],
					boundsCheck: { start: 0, end: 5 },
					boundsCorrect: { start: 0, end: 7 },
					boundsDiff: { start: 2, end: 6 },
					word: "Hello",
					wordCorrect: undefined,
					children: [],
					mergedId: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e"
			  	},
			  	{
					id: "802199c0-6fb3-47cd-a374-46eb402102ae",
					hash: "a2b354d070611fee",
					type: "DEL",
					subtype: "OTHER",
					actions: [],
					boundsCheck: { start: 5, end: 6 },
					boundsCorrect: { start: 5, end: 6 },
					boundsDiff: { start: 5, end: 6 },
					word: " ",
					wordCorrect: undefined,
					children: [],
					mergedId: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e"
			  	},
			  	{
					id: "eb196a14-7dc3-4577-84e6-8d98c8f0bc5a",
					hash: "16372b1f53852cdf",
					type: "DEL",
					subtype: "WORD",
					actions: [],
					boundsCheck: { start: 6, end: 11 },
					boundsCorrect: { start: 6, end: 11 },
					boundsDiff: { start: 6, end: 11 },
					word: "World",
					wordCorrect: undefined,
					children: [],
					mergedId: "0111a33f-80c3-4f92-92f1-4fc3ccb55d7e"
			  	}
			],
			mergedId: null
		}
		const mergedMistake = Mistake.fromData(mergedMistakeData);
		const unmerged = Mistake.unmergeMistake(mergedMistake);
		const rawMistakes = [
			new Mistake({
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 0, end: 5 },
				boundsCorrect: { start: 0, end: 7 },
				boundsDiff: { start: 2, end: 6 },
				word: "Hello",
			}),
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "OTHER",
				boundsCheck: { start: 5, end: 6 },
				boundsCorrect: { start: 5, end: 6 },
				boundsDiff: { start: 5, end: 6 },
				word: " ",
			}),
			new Mistake({
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 6, end: 11 },
				boundsCorrect: { start: 6, end: 11 },
				boundsDiff: { start: 6, end: 11 },
				word: "World",
			}),
		];
		
		const expectedData = rawMistakes.map((m) => getMistakeInstanceBasicData(m));
		const testData = unmerged.map((m) => getMistakeInstanceBasicData(m));

		expect(testData).toStrictEqual(expectedData);
	});

	test("Attempt to unmerge a simple mistake", () => {
		const mistake = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Hello",
		});

		const unmergeData = Mistake.unmergeMistake(mistake);

		expect(unmergeData).toStrictEqual([ mistake ]);
	});

	/*
	--- Hashing ---
	*/

	test("Generate hash of simple mistake", async () => {
		const mistake = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Hello",
		});

		const expectedHash = "2065474d45bc2726";
		const calcHash = await mistake.genHash(true);

		expect(calcHash).toBe(expectedHash);
	});

	test("Generate hash of type=MIXED mistake", async () => {
		const mistake = new Mistake({
			actions: [
				new Action({
					type: "ADD",
					indexCheck: 5,
					indexCorrect: 5,
					char: "o",
					subtype: "ORTHO",
					indexDiff: 5,
				}),
				new Action({
					type: "DEL",
					indexCheck: 5,
					indexCorrect: 5,
					char: "w",
					subtype: "ORTHO",
					indexDiff: 6,
				}),
			],
			type: "MIXED",
			subtype: "WORD",
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 5 },
			boundsDiff: { start: 0, end: 6 },
			word: "Hellw",
			wordCorrect: "Hello"
		});

		const expectedHash = "472c899deef89fd4";
		const calcHash = await mistake.genHash(true);

		expect(calcHash).toBe(expectedHash);
	});

	test("Generate hash of merged mistake", async () => {
		const mergedMistake = new Mistake({
			actions: [],
			type: "MIXED",
			subtype: "MERGED",
			boundsCheck: { start: 5, end: 11 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 11 },
			word: "Hello.. ..World"
		});

		const hash = await mergedMistake.genHash(true);
		const expectedHash = "63366dd0dbf9e97c";

		expect(hash).toStrictEqual(expectedHash);
	});

	test("Hashes of different, related mistake instances match", async () => {
		const mistake1 = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Hello",
		});

		const mistake2 = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 42, end: 48 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 52, end: 58 },
			word: "Hello",
		});

		const hash1 = await mistake1.genHash(true);
		const hash2 = await mistake2.genHash(true);

		expect(hash1).toStrictEqual(hash2);
	});

	test("Hashes of different, unrelated mistake instances don't match", async () => {
		const mistake1 = new Mistake({
			actions: [],
			type: "DEL",
			subtype: "WORD",
			boundsCheck: { start: 0, end: 5 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 2, end: 6 },
			word: "Test",
		});

		const mistake2 = new Mistake({
			actions: [],
			type: "ADD",
			subtype: "WORD",
			boundsCheck: { start: 42, end: 48 },
			boundsCorrect: { start: 0, end: 7 },
			boundsDiff: { start: 52, end: 58 },
			word: "Hello",
		});

		const hash1 = await mistake1.genHash(true);
		const hash2 = await mistake2.genHash(true);

		expect(hash1 !== hash2).toBeTruthy();
	});
});