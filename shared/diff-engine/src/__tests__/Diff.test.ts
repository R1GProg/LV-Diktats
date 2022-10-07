import { logger } from "yatsl";
import Diff, { Mistake } from "../";

function getMistakeInstanceBasicData(mistake: Mistake) {
	return {
		actions: mistake.actions.map((a) => {
			const data = a.exportData() as any;
			delete data.id;
			return data;
		}),
		type: mistake.type,
		subtype: mistake.subtype,
		boundsCheck: mistake.boundsCheck,
		boundsCorrect: mistake.boundsCorrect,
		boundsDiff: mistake.boundsDiff,
		word: mistake.word,
		wordCorrect: mistake.wordCorrect
	}
}

describe("Diff", () => {
	test("Raw diff sequence generation", () => {
		const checkText = "Under the sink, mr. White";
		const correctText = "I'm very high, Mr. White";
		
		const diff = new Diff(checkText, correctText);
		diff.calc(false);
		
		const expectedData = [
			{
				type: "ADD",
				indexCheck: 0,
				indexCorrect: 0,
				item: { index: 0, content: "I'm", type: "WORD" }
			},
			{
				type: "DEL",
				indexCheck: 0,
				indexCorrect: 1,
				item: { index: 0, content: "Under", type: "WORD" }
			},
			{
				type: "ADD",
				indexCheck: 2,
				indexCorrect: 2,
				item: { index: 4, content: "very", type: "WORD" }
			},
			{
				type: "DEL",
				indexCheck: 2,
				indexCorrect: 3,
				item: { index: 6, content: "the", type: "WORD" }
			},
			{
				type: "ADD",
				indexCheck: 4,
				indexCorrect: 4,
				item: { index: 9, content: "high", type: "WORD" }
			},
			{
				type: "DEL",
				indexCheck: 4,
				indexCorrect: 5,
				item: { index: 10, content: "sink", type: "WORD" }
			},
			{
				type: "ADD",
				indexCheck: 7,
				indexCorrect: 7,
				item: { index: 15, content: "Mr", type: "WORD" }
			},
			{
				type: "DEL",
				indexCheck: 7,
				indexCorrect: 8,
				item: { index: 16, content: "mr", type: "WORD" }
			}
		];
		
		expect(diff.getRawSequence()).toStrictEqual(expectedData);
	});

	test("Mistake parsing", () => {
		const checkText = "Under the sink, mr. White";
		const correctText = "I'm very high, Mr. White";
		
		const diff = new Diff(checkText, correctText);
		diff.calc(false);
		const mistakes = Diff.parseMistakes(diff.getRawSequence()!);
		const testData = mistakes.map((m) => getMistakeInstanceBasicData(m));

		const expectedData = [
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 0, end: 0 },
				boundsCorrect: { start: 0, end: 3 },
				boundsDiff: { start: 0, end: 3 },
				word: "I'm",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 0, end: 5 },
				boundsCorrect: { start: 1, end: 1 },
				boundsDiff: { start: 3, end: 8 },
				word: "Under",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 2, end: 2 },
				boundsCorrect: { start: 4, end: 8 },
				boundsDiff: { start: 9, end: 13 },
				word: "very",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 6, end: 9 },
				boundsCorrect: { start: 3, end: 3 },
				boundsDiff: { start: 13, end: 16 },
				word: "the",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 4, end: 4 },
				boundsCorrect: { start: 9, end: 13 },
				boundsDiff: { start: 17, end: 21 },
				word: "high",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 10, end: 14 },
				boundsCorrect: { start: 5, end: 5 },
				boundsDiff: { start: 21, end: 25 },
				word: "sink",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: { start: 7, end: 7 },
				boundsCorrect: { start: 15, end: 17 },
				boundsDiff: { start: 27, end: 29 },
				word: "Mr",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: { start: 16, end: 18 },
				boundsCorrect: { start: 8, end: 8 },
				boundsDiff: { start: 29, end: 31 },
				word: "mr",
				wordCorrect: undefined
			}
		];

		expect(testData).toStrictEqual(expectedData);
	});
	
	test("Whitespace consolidation", () => {
		const checkText = "Under the sink — mr. White";
		const correctText = "I'm very high, Mr. White";
		
		const diff = new Diff(checkText, correctText);
		diff.calc(false);
		
		const mistakes = Diff.parseMistakes(diff.getRawSequence()!);
		diff.setRawMistakes(mistakes);
		diff.consolidatePunctWhitespace();
		
		const testData = mistakes.map((m) => getMistakeInstanceBasicData(m));
		
		const expectedData = [
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: {
					start: 0,
					end: 5
				},
				boundsCorrect: {
					start: 0,
					end: 0
				},
				boundsDiff: {
					start: 0,
					end: 5
				},
				word: "Under",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: {
					start: 1,
					end: 1
				},
				boundsCorrect: {
					start: 0,
					end: 3
				},
				boundsDiff: {
					start: 5,
					end: 8
				},
				word: "I'm",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: {
					start: 6,
					end: 9
				},
				boundsCorrect: {
					start: 2,
					end: 2
				},
				boundsDiff: {
					start: 9,
					end: 12
				},
				word: "the",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: {
					start: 3,
					end: 3
				},
				boundsCorrect: {
					start: 4,
					end: 8
				},
				boundsDiff: {
					start: 12,
					end: 16
				},
				word: "very",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: {
					start: 10,
					end: 14
				},
				boundsCorrect: {
					start: 4,
					end: 4
				},
				boundsDiff: {
					start: 17,
					end: 21
				},
				word: "sink",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: {
					start: 5,
					end: 5
				},
				boundsCorrect: {
					start: 9,
					end: 13
				},
				boundsDiff: {
					start: 21,
					end: 25
				},
				word: "high",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "OTHER",
				boundsCheck: {
					start: 5,
					end: 5
				},
				boundsCorrect: {
					start: 13,
					end: 14
				},
				boundsDiff: {
					start: 25,
					end: 26
				},
				word: ",",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "OTHER",
				boundsCheck: {
					start: 14,
					end: 16
				},
				boundsCorrect: {
					start: 6,
					end: 7
				},
				boundsDiff: {
					start: 26,
					end: 28
				},
				word: " —",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "DEL",
				subtype: "WORD",
				boundsCheck: {
					start: 17,
					end: 19
				},
				boundsCorrect: {
					start: 7,
					end: 7
				},
				boundsDiff: {
					start: 29,
					end: 31
				},
				word: "mr",
				wordCorrect: undefined
			},
			{
				actions: [],
				type: "ADD",
				subtype: "WORD",
				boundsCheck: {
					start: 9,
					end: 9
				},
				boundsCorrect: {
					start: 15,
					end: 17
				},
				boundsDiff: {
					start: 31,
					end: 33
				},
				word: "Mr",
				wordCorrect: undefined
			}
		];
		
		expect(testData).toStrictEqual(expectedData);
	});
	
	test("Word substitution parsing", () => {
		const checkText = "Under the sink — mr. White";
		const correctText = "I'm very high, Mr. White";
		
		const diff = new Diff(checkText, correctText);
		diff.calc(false);
		
		const mistakes = Diff.parseMistakes(diff.getRawSequence()!);
		diff.setRawMistakes(mistakes);
		diff.consolidatePunctWhitespace();
		diff.parseWordSubstitutions();
		
		const testData = mistakes.map((m) => getMistakeInstanceBasicData(m));
		
		const expectedData = [
			{
				actions: [
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "U"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 1,
						indexCorrect: 0,
						indexDiff: 1,
						char: "n"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 0,
						indexDiff: 2,
						char: "d"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 0,
						indexDiff: 3,
						char: "e"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 4,
						indexCorrect: 0,
						indexDiff: 4,
						char: "r"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 5,
						indexCorrect: 0,
						indexDiff: 5,
						char: "I"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 5,
						indexCorrect: 1,
						indexDiff: 6,
						char: "'"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 5,
						indexCorrect: 2,
						indexDiff: 7,
						char: "m"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 0,
					end: 5
				},
				boundsCorrect: {
					start: 0,
					end: 3
				},
				boundsDiff: {
					start: 0,
					end: 5
				},
				word: "Under",
				wordCorrect: "I'm"
			},
			{
				actions: [
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "v"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 1,
						indexDiff: 1,
						char: "t"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 1,
						indexCorrect: 1,
						indexDiff: 2,
						char: "h"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 2,
						indexDiff: 4,
						char: "r"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 3,
						indexDiff: 5,
						char: "y"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 6,
					end: 9
				},
				boundsCorrect: {
					start: 4,
					end: 8
				},
				boundsDiff: {
					start: 9,
					end: 12
				},
				word: "the",
				wordCorrect: "very"
			},
			{
				actions: [
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "h"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 1,
						indexDiff: 1,
						char: "s"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 2,
						indexDiff: 3,
						char: "g"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 3,
						indexDiff: 4,
						char: "h"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 4,
						indexDiff: 5,
						char: "n"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 4,
						indexDiff: 6,
						char: "k"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 10,
					end: 14
				},
				boundsCorrect: {
					start: 9,
					end: 13
				},
				boundsDiff: {
					start: 16,
					end: 20
				},
				word: "sink",
				wordCorrect: "high"
			},
			{
				actions: [
					{
						type: "DEL",
						subtype: "PUNCT",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: " "
					},
					{
						type: "DEL",
						subtype: "PUNCT",
						indexCheck: 1,
						indexCorrect: 0,
						indexDiff: 1,
						char: "—"
					},
					{
						type: "ADD",
						subtype: "PUNCT",
						indexCheck: 2,
						indexCorrect: 0,
						indexDiff: 2,
						char: ","
					}
				],
				type: "MIXED",
				subtype: "OTHER",
				boundsCheck: {
					start: 14,
					end: 16
				},
				boundsCorrect: {
					start: 13,
					end: 14
				},
				boundsDiff: {
					start: 23,
					end: 25
				},
				word: " —",
				wordCorrect: ","
			},
			{
				actions: [
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "M"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 1,
						indexDiff: 1,
						char: "m"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 17,
					end: 19
				},
				boundsCorrect: {
					start: 15,
					end: 17
				},
				boundsDiff: {
					start: 27,
					end: 29
				},
				word: "mr",
				wordCorrect: "Mr"
			}
		];
		
		expect(testData).toStrictEqual(expectedData);
	});

	test("Complete post processing test", () => {
		const checkText = "Under the sink — mr. White";
		const correctText = "I'm very high, Mr. White";
		
		const diff = new Diff(checkText, correctText);
		diff.calc();
		
		const testData = diff.getMistakes().map((m) => getMistakeInstanceBasicData(m));
		
		const expectedData = [
			{
				actions: [
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "U"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 1,
						indexCorrect: 0,
						indexDiff: 1,
						char: "n"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 0,
						indexDiff: 2,
						char: "d"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 0,
						indexDiff: 3,
						char: "e"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 4,
						indexCorrect: 0,
						indexDiff: 4,
						char: "r"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 5,
						indexCorrect: 0,
						indexDiff: 5,
						char: "I"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 5,
						indexCorrect: 1,
						indexDiff: 6,
						char: "'"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 5,
						indexCorrect: 2,
						indexDiff: 7,
						char: "m"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 0,
					end: 5
				},
				boundsCorrect: {
					start: 0,
					end: 3
				},
				boundsDiff: {
					start: 0,
					end: 5
				},
				word: "Under",
				wordCorrect: "I'm"
			},
			{
				actions: [
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "v"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 1,
						indexDiff: 1,
						char: "t"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 1,
						indexCorrect: 1,
						indexDiff: 2,
						char: "h"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 2,
						indexDiff: 4,
						char: "r"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 3,
						indexDiff: 5,
						char: "y"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 6,
					end: 9
				},
				boundsCorrect: {
					start: 4,
					end: 8
				},
				boundsDiff: {
					start: 9,
					end: 12
				},
				word: "the",
				wordCorrect: "very"
			},
			{
				actions: [
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "h"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 1,
						indexDiff: 1,
						char: "s"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 2,
						indexDiff: 3,
						char: "g"
					},
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 3,
						indexDiff: 4,
						char: "h"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 2,
						indexCorrect: 4,
						indexDiff: 5,
						char: "n"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 3,
						indexCorrect: 4,
						indexDiff: 6,
						char: "k"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 10,
					end: 14
				},
				boundsCorrect: {
					start: 9,
					end: 13
				},
				boundsDiff: {
					start: 16,
					end: 20
				},
				word: "sink",
				wordCorrect: "high"
			},
			{
				actions: [
					{
						type: "DEL",
						subtype: "PUNCT",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: " "
					},
					{
						type: "DEL",
						subtype: "PUNCT",
						indexCheck: 1,
						indexCorrect: 0,
						indexDiff: 1,
						char: "—"
					},
					{
						type: "ADD",
						subtype: "PUNCT",
						indexCheck: 2,
						indexCorrect: 0,
						indexDiff: 2,
						char: ","
					}
				],
				type: "MIXED",
				subtype: "OTHER",
				boundsCheck: {
					start: 14,
					end: 16
				},
				boundsCorrect: {
					start: 13,
					end: 14
				},
				boundsDiff: {
					start: 23,
					end: 25
				},
				word: " —",
				wordCorrect: ","
			},
			{
				actions: [
					{
						type: "ADD",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 0,
						indexDiff: 0,
						char: "M"
					},
					{
						type: "DEL",
						subtype: "ORTHO",
						indexCheck: 0,
						indexCorrect: 1,
						indexDiff: 1,
						char: "m"
					}
				],
				type: "MIXED",
				subtype: "WORD",
				boundsCheck: {
					start: 17,
					end: 19
				},
				boundsCorrect: {
					start: 15,
					end: 17
				},
				boundsDiff: {
					start: 27,
					end: 29
				},
				word: "mr",
				wordCorrect: "Mr"
			}
		];
		
		expect(testData).toStrictEqual(expectedData);
		expect(diff.getDistance()).toStrictEqual(expectedData.length);
	});
});