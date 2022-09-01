import type Action from "./Action";
import { Bounds } from "./langUtil";
import { hash } from "./xxhash";

export type MistakeType = "ADD" | "DEL" | "MIXED";

export interface MistakeOpts {
	actions: Action[],
	type: MistakeType,
	registerId?: string,
	boundsCheck?: Bounds,
	boundsCorrect?: Bounds,
	boundsDiff: Bounds,
}

export type MistakeHash = string;

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

	async genHash(): Promise<MistakeHash> {
		const actionCopy = [...this.actions];
		actionCopy.sort((a, b) => a.indexDiff - b.indexDiff); // Sorting by indexDiff, as the order should always be consistent
		const hashPromises = actionCopy.map((a) => a.hash);
		const hashData = (await Promise.all(hashPromises)).join("");
		const enc = new TextEncoder();

		return hash(enc.encode(hashData));
	}
}