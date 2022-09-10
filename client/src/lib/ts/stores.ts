import type { Workspace } from "$lib/types";
import { readable, writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";
import WorkspaceSync from "./WorkspaceSync";
import config from "$lib/config.json";

export enum SortMode {
	MISTAKE,
	ID
}

export const workspace = writable<Workspace | null>(null);
export const mode = writable<ToolbarMode>(ToolbarMode.READ);
export const hideRegistered = writable<boolean>(false);
export const sort = writable<SortMode>(SortMode.MISTAKE);
export const activeSubmission = writable<string | null>(null);
export const workspaceSync = readable<WorkspaceSync>(new WorkspaceSync(config.autosaveTime));
