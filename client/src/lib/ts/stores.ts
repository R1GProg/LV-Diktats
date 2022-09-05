import type { Workspace } from "$lib/types";
import { writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";

export const workspace = writable<Workspace | null>(null);
export const mode = writable<ToolbarMode>(ToolbarMode.READ);
