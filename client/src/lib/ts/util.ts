import type { RegisterEntry, Submission, Workspace } from "@shared/api-types";
import type { MistakeData, MistakeHash } from "@shared/diff-engine";

export function deleteFirstMatching<T>(arr: T[], predicate: (val: T, i: number) => boolean) {
	for (let i = 0; i < arr.length; i++) {
		if (predicate(arr[i], i)) {
			arr.splice(i, 1);
			return;
		}
	}
}

export function deleteAllMatching<T>(arr: T[], predicate: (val: T, i: number) => boolean) {
	let indexOffset = 0;

	for (let i = 0; i < arr.length; i++) {
		if (predicate(arr[i], i + indexOffset)) {
			arr.splice(i, 1);
			indexOffset++;
		}
	}
}

export function readTextFile(file: File) {
	return new Promise<string | null>((res, rej) => {
		const reader = new FileReader();
		reader.onload = (event) => res(event.target?.result as string | null);
		reader.onerror = rej;
		reader.readAsText(file);
	});
}

export function downloadText(filename: string, text: string) {
	const blob = new Blob([text], {type: 'application/json'});

    const elem = document.createElement('a');
	const blobUrl = URL.createObjectURL(blob);
    elem.href = blobUrl
    elem.download = filename;

    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);

	URL.revokeObjectURL(blobUrl);
}

export function getAllSubmissionsWithMistakes(submissions: Submission[], mistakes: MistakeHash[]) {
	const output: string[] = [];

	for (const sub of submissions) {
		const hashes = sub.data.mistakes.map((m) => m.hash);

		if (mistakes.every((m) => hashes.includes(m))) {
			output.push(sub.id);
		}
	}

	return output;
}

export function submissionContainsMistake(submission: Submission, mistake: MistakeHash) {
	for (const m of submission.data.mistakes) {
		if (m.hash === mistake) return true;
	}

	return false;
}

export function mistakeInRegister(hash: MistakeHash, register: RegisterEntry[]) {
	return !!register.find((e) => e.mistakes.includes(hash));
}

export function getRegisterId(hash: MistakeHash, register: RegisterEntry[]) {
	return register.find((e) => e.mistakes.includes(hash))?.id ?? null;
}

export function getRegisterEntry(hash: MistakeHash, register: RegisterEntry[]) {
	return register.find((e) => e.mistakes.includes(hash)) ?? null;
}

// A pretty temporary and hacky check for a special case
export function isMistakeASentenceBreak(m: MistakeData) {
	if (m.children.length === 2) {
		const wordMistake = m.children.find((c) => c.subtype === "WORD");
		const punctMistake = m.children.find((c) => c.subtype === "OTHER");

		if (!wordMistake || !punctMistake) return false;
		if (!(punctMistake.word.includes(".") || punctMistake.wordCorrect?.includes("."))) return false;
		if (wordMistake.actions.length !== 2) return false;
		
		const addAction = wordMistake.actions.find((a) => a.type === "ADD");
		const delAction = wordMistake.actions.find((a) => a.type === "DEL");

		if (!addAction || !delAction) return false;
		if (addAction.char.toLocaleLowerCase() !== delAction.char.toLocaleLowerCase()) return false;

		return true;
	}

	return false;
}

export function countRegisteredMistakes(subm: Submission, reg: RegisterEntry[]) {
	return subm.data.mistakes.filter((m) => mistakeInRegister(m.hash, reg)).length;
}

export function getSubmissionGradingStatus(subm: Submission, ws: Workspace) {
	const num = countRegisteredMistakes(subm, ws.register);
	
	if (num === subm.data.mistakes.length) {
		return 2;
	} else if (num === 0) {
		return 0;
	} else {
		return 1;
	}
}
