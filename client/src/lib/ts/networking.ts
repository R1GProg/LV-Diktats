import config from "$lib/config.json";
import type { Submission, SubmissionID, UUID } from "@shared/api-types";
import type { Mistake } from "@shared/diff-engine";
import Diff from "@shared/diff-engine";
import { get } from "svelte/store";
import { workspace } from "./stores";

export const APP_ONLINE: Promise<boolean> = new Promise(async (res, rej) => {
	try {
		const isOnline = (await fetch(config.endpointUrl)).status === 200;

		console.log(isOnline ? "ONLINE MODE" : "OFFLINE MODE");

		res(isOnline);
	} catch (err) {
		console.log("OFFLINE MODE");
		res(false);
	}
});

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

export async function fetchSubmission(id: SubmissionID, workspaceId: UUID): Promise<Submission> {
	// TODO: Implement fetch from cache or fetch from server via Socket.io
	const rawData = get(workspace)!.submissions[id];
	
	// rawData.data!.text = "Hedlw warld!";
	// get(workspace)!.template = "Hello world!";

	// const text = parseIgnoreBounds(rawData.data!.text, rawData.data!.ignoreText);
	const text = rawData.data!.text;
	const diff = new Diff(text, get(workspace)!.template);
	diff.calc();
	rawData.data!.mistakes = await Promise.all(diff.getMistakes().map((m: Mistake) => m.exportData()));

	return rawData;
}
