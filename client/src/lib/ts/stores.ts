import type { Submission, SubmissionID, UUID, Workspace } from "@shared/api-types";
import { get, readable, writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";
import WorkspaceCache from "./WorkspaceCache";
import { onMount } from "svelte";
import { ds } from "$lib/ts/networking/DiktifySocket";
import { api } from "$lib/ts/networking/DiktifyAPI";
import type { MistakeId } from "@shared/diff-engine";

export enum SortMode {
	MISTAKE,
	ID
}

export const mode = writable<ToolbarMode>(ToolbarMode.READ);
export const hideRegistered = writable<boolean>(false);
export const sort = writable<SortMode>(SortMode.MISTAKE);
export const hoveredMistake = writable<MistakeId | null>(null);

export const activeSubmissionID = writable<SubmissionID | null>(null);
export const activeWorkspaceID = writable<UUID | null>(null);

export const workspace = readable<Promise<Workspace> | null>(null, (set) => {
	activeWorkspaceID.subscribe((newID: UUID | null) => {
		if (newID === null) {
			set(null);
		} else {
			set(api.getWorkspace(newID));
		}
	});
});

export const activeSubmission = readable<Promise<Submission | null> | null>(null, (set) => {
	let cache = new Promise<WorkspaceCache>((res) => {
		onMount(() => {
			res(new WorkspaceCache());
		});
	});

	activeSubmissionID.subscribe(async (newID: string | null) => {
		if (newID === null || get(activeWorkspaceID) === null) {
			set(null);
		} else {
			const submission = (await cache).getSubmission(newID, get(activeWorkspaceID)!);
			set(submission);
		}
	});
});
