import type { ToolbarMode } from "../toolbar";
import type { EventCallback, EventData } from "./EventManager";
import type EventManager from "./EventManager";

export interface ToolbarEvents {
	change: (data: EventData) => void
}

export function attachToolbarEvents(mngr: EventManager<ToolbarEvents>) {
	
}

function onToolbarModeChange(newMode: ToolbarMode) {

}
