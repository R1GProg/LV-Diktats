import { Action, ActionData } from "../Action";

describe("Action", () => {
	test(".exportData()", () => {
		const action = new Action({
			type: "ADD",
			indexCheck: 0,
			indexCorrect: 1,
			char: "a",
			subtype: "ORTHO",
			indexDiff: 1,
		});

		const output = action.exportData();
		const expectedOutput = {
			id: action.id,
			type: action.type,
			subtype: action.subtype,
			indexCheck: action.indexCheck,
			indexCorrect: action.indexCorrect,
			indexDiff: action.indexDiff,
			char: action.char
		}

		expect(output).toStrictEqual(expectedOutput);
	});

	test(".fromData()", () => {
		const rawData: ActionData = {
			id: "4e6d1978-7d1f-4375-bcee-82076d3cd60b",
			type: "ADD",
			indexCheck: 0,
			indexCorrect: 1,
			char: "a",
			subtype: "ORTHO",
			indexDiff: 1,
		};

		const action = Action.fromData(rawData);
		
		const checkData = {
			id: action.id,
			type: action.type,
			subtype: action.subtype,
			indexCheck: action.indexCheck,
			indexCorrect: action.indexCorrect,
			indexDiff: action.indexDiff,
			char: action.char
		}

		expect(checkData).toStrictEqual(rawData);
	});
});