import type { Workspace } from "$lib/types";
import { writable } from "svelte/store";

export const workspace = writable<Workspace | null>(null);
