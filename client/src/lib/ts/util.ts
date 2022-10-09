import type { RegisterEntry, Submission } from "@shared/api-types";
import type { MistakeHash } from "@shared/diff-engine";
import { processString } from "@shared/normalization";

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

export function downloadURL (filename: string, url: string) {
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;

	document.body.appendChild(a);

	a.style.display = "none";
	a.click();
	a.remove();
}

export function downloadText(filename: string, text: string) {
	downloadURL(filename, `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
}

export function downloadBinary(filename: string, data: Uint8Array) {
	const blob = new Blob([ data ], {
		type: "application/octet-stream"
	});

	const url = URL.createObjectURL(blob);
	downloadURL(filename, url);

	setTimeout(function() {
		return URL.revokeObjectURL(url);
	}, 1000);
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

export async function fetchDebugDataset() {
	const csvReq = await fetch("/raw/data.csv");
	const csv = await csvReq.text();

	const tempReq = await fetch("/raw/correct.txt");
	const template = processString(await tempReq.text());

	return { csv, template };
}
