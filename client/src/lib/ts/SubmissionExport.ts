import type { ExportedSubmission, ExportedSubmissionMistake, ExportedSubmissionMistakeType, Submission, Workspace } from "@shared/api-types";
import type { MistakeData } from "@shared/diff-engine";

function addMissingWordsToText(rawText: string, mistakes: MistakeData[]) {
	let text = rawText;

	const addContentArr = mistakes
		.filter((m) => m.type === "ADD")
		.map((m) => ({ content: m.word, index: m.boundsDiff.start }));
	
	addContentArr.sort((a, b) => a.index - b.index);

	for (const entry of addContentArr) {
		const textBefore = text.substring(0, entry.index);
		const textAfter = text.substring(entry.index);

		text = `${textBefore}${entry.content}${textAfter}`;
	}

	return text;
}

export function exportSubmission(subm: Submission, workspace: Workspace): ExportedSubmission {
	// Add missing text
	const unwrappedMistakes = subm.data.mistakes.flatMap((m) => m.subtype === "MERGED" ? m.children : m);
	const parsedText = addMissingWordsToText(subm.data.text, unwrappedMistakes);
	
	// Recalculate diff indices to account for not having MIXED ADD characters
	let offset = 0;

	for (const m of subm.data.mistakes) {
		m.boundsDiff.start -= offset;
		m.boundsDiff.end -= offset;

		const children = m.subtype === "MERGED" && m.type === "MIXED" ? m.children : [ m ];

		for (const child of children) {
			if (child.type === "MIXED") {
				const addChars = child.actions.filter((a) => a.type === "ADD").length;
				offset += addChars;
				m.boundsDiff.end -= addChars;
			}
		}
	}

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
			bound: m.boundsDiff,
			description: registerEntry.description,
			submissionStatistic: registerEntry.count,
			percentage: Math.round(registerEntry.count / totalSubmCount * 10000) / 10000,
			mistakeType,
		});
	}

	return {
		author: "Anonīms",
		text: parsedText,
		mistakes
	}
}