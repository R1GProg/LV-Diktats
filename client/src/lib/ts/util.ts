import type { Submission } from "@shared/api-types";
import type { MistakeHash } from "@shared/diff-engine";

export function readTextFile(file: File) {
	return new Promise<string | null>((res, rej) => {
		const reader = new FileReader();
		reader.onload = (event) => res(event.target?.result as string | null);
		reader.onerror = rej;
		reader.readAsText(file);
	});
}

export function downloadText(filename: string, text: string) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	
	element.style.display = 'none';
	document.body.appendChild(element);
	
	element.click();
	
	document.body.removeChild(element);
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
