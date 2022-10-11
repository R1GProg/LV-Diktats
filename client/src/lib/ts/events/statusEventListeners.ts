import type { EventCallback, EventData } from "./EventManager";
import type EventManager from "./EventManager";

export interface StatusEvents {
	change: (data: EventData) => void
}

export function attachStatusEvents(mngr: EventManager<StatusEvents>) {

}