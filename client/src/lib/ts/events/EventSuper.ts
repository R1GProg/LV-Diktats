// Attaches all events and provides a unified interface

import EventManager, { type EventData } from "./EventManager";
import { attachToolbarEvents, type ToolbarEvents } from "./toolbarEventListeners";
import { attachMistakeEvents, type MistakeEvents } from "./mistakeEventListeners";
import { attachSelectionEvents, type SelectionEvents } from "./selectionEventListeners";
import { attachStatusEvents, type StatusEvents } from "./statusEventListeners";

export default class EventSuper {
	mistake: EventManager<MistakeEvents>;

	selection: EventManager<SelectionEvents>;

	toolbar: EventManager<ToolbarEvents>;

	status: EventManager<StatusEvents>;

	constructor() {
		this.mistake = new EventManager();
		this.selection = new EventManager();
		this.toolbar = new EventManager();
		this.status = new EventManager();

		attachMistakeEvents(this.mistake);
		attachSelectionEvents(this.selection);
		attachStatusEvents(this.status);
		attachToolbarEvents(this.toolbar);
	}
}
