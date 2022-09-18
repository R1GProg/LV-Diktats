import config from "$lib/config.json";
import type { Submission, SubmissionID, UUID } from "@shared/api-types";
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

export async function fetchSubmission(id: SubmissionID, workspaceId: UUID): Promise<Submission> {
	// TODO: Implement fetch from cache or fetch from server via Socket.io
	return get(workspace)!.submissions[id];
}
