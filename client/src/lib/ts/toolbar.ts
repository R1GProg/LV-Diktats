import type { Stores } from "./stores";

export enum ToolbarMode {
	READ,
	EDIT,
	IGNORE,
	MERGE,
	REGISTER,
}

export interface ToolbarModeEvent {
	newMode: ToolbarMode,
	prevMode: ToolbarMode | null,
}

export type ToolbarModeEventCallback = (ev: ToolbarModeEvent) => void;

let cbs: ToolbarModeEventCallback[] = [];
let prevMode: ToolbarMode | null = null;

export function subToToolbarMode(cb: ToolbarModeEventCallback) {
	cbs.push(cb);
}

export function initSub(mode: Stores["mode"]) {
	mode.subscribe((newVal) => {
		if (prevMode === newVal) return;
	
		for (const cb of cbs) {
			cb({
				newMode: newVal,
				prevMode,
			});
		}
	
		prevMode = newVal;
	});
}
