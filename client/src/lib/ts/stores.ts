import type { Workspace } from "$lib/types";
import { writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";

export enum SortMode {
	MISTAKE,
	ID
}

export const workspace = writable<Workspace | null>(null);
export const mode = writable<ToolbarMode>(ToolbarMode.READ);
export const hideRegistered = writable<boolean>(false);
export const sort = writable<SortMode>(SortMode.MISTAKE);
