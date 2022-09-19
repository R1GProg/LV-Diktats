import type { Submission, SubmissionID, Workspace } from "@shared/api-types";
import { get, readable, writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";
import WorkspaceDatabase from "./WorkspaceDatabase";
import { onMount } from "svelte";
import { ds } from "./DiktifySocket";
import { api } from "./DiktifyAPI";
import type { MistakeId } from "@shared/diff-engine";

export enum SortMode {
	MISTAKE,
	ID
}

export const workspace = writable<Workspace | null>(null);
export const mode = writable<ToolbarMode>(ToolbarMode.READ);
export const hideRegistered = writable<boolean>(false);
export const sort = writable<SortMode>(SortMode.MISTAKE);
export const hoveredMistake = writable<MistakeId | null>(null);
export const activeSubmissionID = writable<SubmissionID | null>(null);

export const activeSubmission = readable<Promise<Submission> | null>(null, (set) => {
	activeSubmissionID.subscribe((newID: string | null) => {
		if (newID === null || get(workspace) === null) {
			set(null);
		} else {
			set(ds.requestSubmission(newID, get(workspace)!.id));
		}
	});
});

export const workspaceDatabase = readable<WorkspaceDatabase | null>(null, (set) => {
	onMount(() => {
		set(new WorkspaceDatabase());
	});
});
