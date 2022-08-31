import type Action from "./Action";
import { Bounds } from "./langUtil";

export type MistakeType = "ADD" | "DEL" | "MIXED";

export interface MistakeOpts {
	actions: Action[],
	type: MistakeType,
	registerId?: string,
	boundsCheck?: Bounds,
	boundsCorrect?: Bounds,
	boundsDiff: Bounds,
}

export default class Mistake {
	actions: Action[] = [];

	type: MistakeType;

	registerId?: string;

	boundsCheck?: Bounds;
	
	boundsCorrect?: Bounds;

	boundsDiff: Bounds;

	constructor(opts: MistakeOpts) {
		this.actions = opts.actions;
		this.type = opts.type;
		this.registerId = opts.registerId;
		this.boundsCheck = opts.boundsCheck;
		this.boundsCorrect = opts.boundsCorrect;
		this.boundsDiff = opts.boundsDiff;

		for (const action of this.actions) {
			action.mistake = this;
		}
	}
}