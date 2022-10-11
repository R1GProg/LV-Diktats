import type MistakeSelection from "../MistakeSelection";
import type EventManager from "./EventManager";
import type { EventCallback, EventData } from "./EventManager";

export interface SelectionEvents {
	change: (data: EventData) => void
}

export function attachSelectionEvents(mngr: EventManager<SelectionEvents>) {
	// sel.onChange(onSelectionChange);
	mngr.addListener("change", onSelectionChange);
}

function onSelectionChange(data: EventData) {

}
