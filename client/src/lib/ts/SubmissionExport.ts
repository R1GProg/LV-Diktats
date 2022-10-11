import type { ExportedSubmission, ExportedSubmissionMistake, ExportedSubmissionMistakeType, Submission, Workspace } from "@shared/api-types";
import type { Bounds, MistakeData, MistakeId } from "@shared/diff-engine";

function addMissingWordsToText(rawText: string, mistakes: MistakeData[], adjBounds: Record<MistakeId, Bounds>) {
	let text = rawText;

	console.log(adjBounds);

	const addContentArr = mistakes
		.filter((m) => m.type === "ADD")
		.map((m) => ({ content: m.word, index: adjBounds[m.id].start }));

	addContentArr.sort((a, b) => a.index - b.index);

	for (const entry of addContentArr) {
		const textBefore = text.substring(0, entry.index);
		const textAfter = text.substring(entry.index);

		text = `${textBefore}${entry.content}${textAfter}`;
	}

	return text;
}

export function exportSubmission(subm: Submission, workspace: Workspace): ExportedSubmission {
	// Add mistake descriptions from register
	const mistakes: ExportedSubmissionMistake[] = [];
	const totalSubmCount = Object.values(workspace.submissions).length;

	for (const m of subm.data.mistakes) {
		const registerEntry = workspace.register.find((e) => e.mistakes.includes(m.hash));

		if (!registerEntry) continue;
		if (registerEntry.ignore) continue;

		let mistakeType: ExportedSubmissionMistakeType = "MERGED";

		switch(m.subtype) {
			case "WORD":
				mistakeType = "ORTHO";
				break;
			case "OTHER":
				mistakeType = "PUNCT";
				break;
			case "MERGED":
				if (m.children.every((c) => c.subtype === "WORD")) {
					mistakeType = "ORTHO";
				} else if (m.children.every((c) => c.subtype === "OTHER")) {
					mistakeType = "PUNCT";
				} else {
					// Special case for wrong or missing sentence stops
					if (m.children.length === 2) {
						const wordMistake = m.children.find((c) => c.subtype === "WORD");
						const punctMistake = m.children.find((c) => c.subtype === "OTHER");

						if (!wordMistake || !punctMistake) break;
						if (!(punctMistake.word.includes(".") || punctMistake.wordCorrect?.includes("."))) break;
						if (wordMistake.actions.length !== 2) break;
						
						const addAction = wordMistake.actions.find((a) => a.type === "ADD");
						const delAction = wordMistake.actions.find((a) => a.type === "DEL");

						if (!addAction || !delAction) break;
						if (addAction.char.toLocaleLowerCase() !== delAction.char.toLocaleLowerCase()) break;

						mistakeType = "PUNCT";
						break;
					}
				}

				break;
		}

		mistakes.push({
			id: m.id,
			bounds: [],
			description: registerEntry.description,
			submissionStatistic: registerEntry.count,
			percentage: Math.round(registerEntry.count / totalSubmCount * 10000) / 10000,
			mistakeType,
		});
	}

	// Add missing text
	const exportedMistakeIDs = mistakes.map((m) => m.id);
	const exportedMistakes = subm.data.mistakes.filter((m) => exportedMistakeIDs.includes(m.id));
	const adjBounds: Record<MistakeId, Bounds> = {};

	// Recalculate diff indices to account for not having MIXED ADD characters
	let offset = 0;

	for (const m of subm.data.mistakes) {
		const checkMistakes = m.subtype === "MERGED" ? m.children : [ m ];

		// Adjust offset for mistakes that aren't included
		if (!exportedMistakeIDs.includes(m.id)) {
			for (const checkM of checkMistakes) {
				if (checkM.type === "ADD") {
					offset += checkM.word.length;
				} else if (checkM.type === "MIXED") {
					offset += checkM.actions.filter((a) => a.type === "ADD").length;
				}
			}

			continue;
		}

		const bounds: Bounds[] = [];

		for (const child of checkMistakes) {
			const childBounds: Bounds = {
				start: child.boundsDiff.start - offset,
				end: child.boundsDiff.end - offset
			};

			adjBounds[child.id] = childBounds;

			if (child.type === "MIXED") {
				const addChars = child.actions.filter((a) => a.type === "ADD").length;
				offset += addChars;
			}

			bounds.push(childBounds);
		}

		mistakes.find((checkM) => checkM.id === m.id)!.bounds = bounds;
	}

	// Parse text
	const unwrappedMistakes = exportedMistakes.flatMap((m) => m.subtype === "MERGED" ? m.children : m);
	const parsedText = addMissingWordsToText(subm.data.text, unwrappedMistakes, adjBounds);

	// For mistakes, where a single space is inbetween bounds, add the space to the bounds
	for (const m of mistakes) {
		if (m.bounds.length === 1) continue;

		const parsedBounds: Bounds[] = [...m.bounds];

		for (let i = 0; i < parsedBounds.length - 1; i++) {
			const b1 = m.bounds[i];
			const b2 = m.bounds[i + 1];

			if (
				b1.end + 1 === b2.start
				&& parsedText.substring(b1.end, b2.start) === " "
			) {
				b1.end = b2.end;
				parsedBounds.splice(i + 1, 1);
				i--;
			}
		}

		m.bounds = parsedBounds;
	}

	return {
		author: "Anonīms",
		text: parsedText,
		isRejected: subm.state === "REJECTED",
		mistakes
	}
}

function genRandInt(min: number, max: number): number {
	return Math.round(Math.random() * (max - min)) + min;
}

function genRandLetter(includeNums = true): string {
	const num = genRandInt(0, includeNums ? 35 : 25);

	if (num > 25) {
		return (num - 26).toString();
	} else {
		return String.fromCharCode("a".charCodeAt(0) + num);
	}
}

// Generates an id with the pattern XNXNXNX
export function genURLId(len = 7): string {
	let output = "";

	for (let i = 0; i < len; i++) {
		output += i % 2 === 0 ? genRandLetter() : genRandInt(0, 9);
	}

	return output;
}
