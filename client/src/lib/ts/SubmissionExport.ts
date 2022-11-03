import type { ExportedSubmission, ExportedSubmissionMistake, ExportedSubmissionMistakeBounds, RegisterEntry, Submission, Workspace } from "@shared/api-types";
import type { Bounds, MistakeData, MistakeId } from "@shared/diff-engine";
import { getAllSubmissionsWithMistakes, getRegisterEntry } from "./util";

function addBoundOffset(b: Bounds, offset: number): Bounds {
	return {
		start: b.start + offset,
		end: b.end + offset
	}
}

function addMissingWordsToText(rawText: string, words: { word: string, index: number }[]) {
	let text = rawText;
	const wordArr = [...words];
	wordArr.sort((a, b) => a.index - b.index);

	for (const entry of wordArr) {
		const textBefore = text.substring(0, entry.index);
		const textAfter = text.substring(entry.index);

		text = `${textBefore}${entry.word}${textAfter}`;
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

function parseExportOptions(m: MistakeData, regEntry: RegisterEntry, submissions: Submission[], avgMistakes: { ortho: number, punct: number }) {
	let mistakeCount: number;
	
	switch (regEntry.opts.countType) {
		case "TOTAL":
			mistakeCount = regEntry.count;
			break;
		case "VARIATION":
			mistakeCount = getAllSubmissionsWithMistakes(submissions, [ m.hash ]).length;
			break;
		case "NONE":
			mistakeCount = -1;
			break;
	}
		
	let typeCounter: { ortho: number, punct: number };
		
	switch (regEntry.opts.mistakeType) {
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

	return { mistakeCount, typeCounter };
}

// Readjust indices for separating MIXED mistakes
function genDiffBounds(subm: Submission, exportedMistakeIDs: string[]) {
	const adjBounds: Record<MistakeId, ExportedSubmissionMistakeBounds[]> = {};

	let offset = 0;

	for (const m of subm.data.mistakes) {
		if (!exportedMistakeIDs.includes(m.id)) {
			if (m.type === "ADD") {
				const wordLen = m.subtype === "MERGED" ? m.children.map((c) => c.word).join("").length : m.word.length;
				offset += wordLen;
			} else if (m.type === "MIXED") {
				const actions = m.subtype === "MERGED" ? m.children.flatMap((c) => c.actions) : m.actions;
				offset += actions.filter((a) => a.type === "ADD").length;
			}
			
			continue;
		}

		const children = m.subtype === "MERGED" ? m.children : [ m ];
		const bounds: ExportedSubmissionMistakeBounds[] = [];

		for (const c of children) {
			if (c.type === "MIXED") {
				const charOffset = c.actions.filter((a) => a.type === "ADD").length;

				const adjDelBounds = {
					start: c.boundsDiff.start - offset,
					end: c.boundsDiff.end - offset - charOffset
				};

				bounds.push({
					type: "DEL",
					bounds: adjDelBounds,
					content: c.word	
				});

				const addStart = adjDelBounds.end;
				
				bounds.push({
					type: "ADD",
					content: c.wordCorrect!,
					bounds: {
						start: addStart,
						end: addStart + c.wordCorrect!.length,
					}
				});

				// Adjust for the char difference when separating
				offset += charOffset - c.wordCorrect!.length;
			} else {
				bounds.push({
					type: c.type,
					bounds: addBoundOffset(c.boundsDiff, -offset),
					content: c.word
				});
			}
		}

		// Special case bound repositioning for words that have an unnecessary space in the middle
		// quite hacky
		if (children.length === 2) {
			const mixedMistake = children.find((c) => c.type === "MIXED");
			const delMistake = children.find((c) => c.type === "DEL");

			if (
				mixedMistake
				&& delMistake
				&& mixedMistake.wordCorrect!.includes(delMistake.word.trim())
			) {
				const addBoundIndex = bounds.findIndex((b) => b.type === "ADD");

				// If the add is in the middle
				if (addBoundIndex === 1) {
					const otherDelBound = bounds[2];
					const addBound = bounds[1];

					otherDelBound.bounds = {
						start: addBound.bounds.start + 1,
						end: addBound.bounds.start + 1 + otherDelBound.content.length,
					};
					
					addBound.bounds = {
						start: otherDelBound.bounds.end,
						end: otherDelBound.bounds.end + addBound.content.length,
					}
				}
			}
		}

		bounds.sort((a, b) => a.bounds.start - b.bounds.start);
		adjBounds[m.id] = bounds;
	}

	return adjBounds;
}

function parseText(subm: Submission, adjBounds: Record<MistakeId, ExportedSubmissionMistakeBounds[]>) {
	const parsedRaw = parseIgnoreBounds(subm.data.text, subm.data.ignoreText);
	const words = Object.values(adjBounds)
		.flatMap((boundArr) => boundArr
			.filter((b) => b.type === "ADD")
			.map((b) => ({ word: b.content, index: b.bounds.start }))
		);

	return addMissingWordsToText(parsedRaw, words);
}

function consolidateSpaceSeparatedBounds(parsedText: string, mistakes: ExportedSubmissionMistake[]) {
	for (const m of mistakes) {
		if (m.bounds.length === 1) continue;

		const parsedBounds: ExportedSubmissionMistakeBounds[] = [...m.bounds];

		for (let i = 0; i < parsedBounds.length - 1; i++) {
			const b1 = m.bounds[i];
			const b2 = m.bounds[i + 1];

			if (
				b1.type === b2.type
				&& b1.bounds.end + 1 === b2.bounds.start
				&& parsedText.substring(b1.bounds.end, b2.bounds.start) === " "
			) {
				b1.bounds.end = b2.bounds.end;
				parsedBounds.splice(i + 1, 1);
				i--;
			}
		}

		m.bounds = parsedBounds;
	}
}

function trimBounds(parsedText: string, mistakes: ExportedSubmissionMistake[]) {
	for (const m of mistakes) {
		for (const b of m.bounds) {
			const content = parsedText.substring(b.bounds.start, b.bounds.end);

			if (content === " ") continue;

			const spacesBefore = content.length - content.trimStart().length;
			const spacesAfter = content.length - content.trimEnd().length;

			b.bounds = {
				start: b.bounds.start + spacesBefore,
				end: b.bounds.end - spacesAfter
			};

			b.content = b.content.trim();
		}
	}
}

export function exportSubmission(subm: Submission, workspace: Workspace): ExportedSubmission {
	// Add mistake descriptions from register
	const mistakes: ExportedSubmissionMistake[] = [];
	const totalSubmCount = Object.values(workspace.submissions).length;
	const avgMistakes = calcSubmissionAvgMistakesPerWord(subm, workspace);
	const submissions = Object.values(workspace.submissions) as unknown as Submission[];

	// Generate mistake metadata
	for (const m of subm.data.mistakes) {
		const registerEntry = getRegisterEntry(m.hash, workspace.register);

		if (!registerEntry) continue;
		if (registerEntry.opts.ignore) continue;

		const { mistakeCount, typeCounter } = parseExportOptions(m, registerEntry, submissions, avgMistakes);

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

	// Generate bounds
	const exportedMistakeIDs = mistakes.map((m) => m.id);
	const adjBounds = genDiffBounds(subm, exportedMistakeIDs);

	for (const m of mistakes) {
		m.bounds = adjBounds[m.id];
	}

	const parsedText = parseText(subm, adjBounds);

	console.log(mistakes);

	// Modifies mistakes by reference
	// consolidateSpaceSeparatedBounds(parsedText, mistakes);
	// trimBounds(parsedText, mistakes);

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
