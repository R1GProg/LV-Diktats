import type { EventCallback, EventData } from "./EventManager";
import type EventManager from "./EventManager";

export interface MistakeEvents {
	leftClick: (data: EventData) => void,
	rightClick: (data: EventData) => void
}

export function attachMistakeEvents(mngr: EventManager<MistakeEvents>) {
	mngr.addListener("leftClick", onMistakeClick);
	mngr.addListener("rightClick", onMistakeRightClick);
}

export function onMistakeClick(data: EventData) {

}

export function onMistakeRightClick(data: EventData) {
	
}