import type { ExportedSubmission, ExportedSubmissionMistake, Submission, Workspace } from "@shared/api-types";
import type { Bounds, MistakeData, MistakeId } from "@shared/diff-engine";
import { getAllSubmissionsWithMistakes } from "./util";

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

function parseIgnoreBounds(rawText: string, ignoreBounds: Bounds[]) {
	let text = rawText;
	let offset = 0;

	for (const bounds of ignoreBounds) {
		const sub1 = text.substring(0, bounds.start - offset);
		const sub2 = text.substring(bounds.end - offset);
		text = (sub1 + sub2).trim();

		offset += bounds.end - bounds.start;
	}

	return text;
}

function calcSubmissionAvgMistakesPerWord(subm: Submission, ws: Workspace): { punct: number, ortho: number } {
	const output = { ortho: 0, punct: 0 };

	for (const m of subm.data.mistakes) {
		const registerEntry = ws.register.find((e) => e.mistakes.includes(m.hash));

		if (!registerEntry) continue;
		if (registerEntry.opts.ignore) continue;
		if (registerEntry.opts.mistakeType === "TEXT") continue;

		if (registerEntry.opts.mistakeType === "ORTHO") {
			output.ortho++;
		} else {
			output.punct++;
		}
	}

	const wordCount = subm.data.text.split(" ").length;
	output.ortho /= wordCount;
	output.punct /= wordCount;

	return output;
}

export function exportSubmission(subm: Submission, workspace: Workspace): ExportedSubmission {
	// Add mistake descriptions from register
	const mistakes: ExportedSubmissionMistake[] = [];
	const totalSubmCount = Object.values(workspace.submissions).length;
	const avgMistakes = calcSubmissionAvgMistakesPerWord(subm, workspace);

	for (const m of subm.data.mistakes) {
		const registerEntry = workspace.register.find((e) => e.mistakes.includes(m.hash));

		if (!registerEntry) continue;
		if (registerEntry.opts.ignore) continue;

		let mistakeCount: number;

		switch (registerEntry.opts.countType) {
			case "TOTAL":
				mistakeCount = registerEntry.count;
				break;
			case "VARIATION":
				mistakeCount = getAllSubmissionsWithMistakes(
					Object.values(workspace.submissions) as unknown as Submission[],
					[ m.hash ]
				).length;

				break;
			case "NONE":
				mistakeCount = -1;
				break;
		}

		let typeCounter: { ortho: number, punct: number };

		switch (registerEntry.opts.mistakeType) {
			case "ORTHO":
				typeCounter = { ortho: 1, punct: 0 };
				break;
			case "PUNCT":
				typeCounter = { ortho: 0, punct: 1 };
				break;
			case "TEXT":
				{
					const mistakeLen = m.children.filter((c) => c.subtype === "WORD").length;

					typeCounter = {
						ortho: Math.max(1, Math.round(mistakeLen * avgMistakes.ortho)),
						punct: Math.max(1, Math.round(mistakeLen * avgMistakes.punct))
					};
				}
				break;
		}

		mistakes.push({
			id: m.id,
			bounds: [],
			description: registerEntry.description,
			submissionStatistic: mistakeCount,
			percentage: Math.round(mistakeCount / totalSubmCount * 10000) / 10000,
			mistakeType: registerEntry.opts.mistakeType,
			typeCounter
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
	const parsedText = addMissingWordsToText(
		parseIgnoreBounds(subm.data.text, subm.data.ignoreText),
		unwrappedMistakes,
		adjBounds
	);

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
