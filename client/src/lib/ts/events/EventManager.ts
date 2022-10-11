import { v4 as uuidv4 } from "uuid";

export interface EventData {
	event: string;
	data: any;
}

export type EventCallback = (event: EventData) => void;

export default class EventManager<T> {
	private cbs: Record<string, Record<string, EventCallback>> = {};

	constructor() {}

	private callAllCbs(event: string, data: EventData) {
		for (const cb of Object.values(this.cbs[event])) {
			cb(data);
		}
	}

	emit(event: keyof T, data: any) {
		const evKey = event as string;
		this.callAllCbs(evKey, { event: evKey, data });
	}

	addListener(event: keyof T, cb: EventCallback) {
		const evKey = event as string;
		const id = uuidv4();
		this.cbs[evKey][id] = cb;

		return id;
	}

	removeListener(event: keyof T, id: string): boolean {
		const evKey = event as string;
		
		if (!(id in this.cbs[evKey])) return false;

		delete this.cbs[evKey][id];
		return true;
	}
}