import type Action from "./Action";
import { Bounds } from "./langUtil";
import { hash } from "./xxhash";
import { v4 as uuidv4 } from "uuid";

export type MistakeType = "ADD" | "DEL" | "MIXED";
export type MistakeSubtype = "WORD" | "OTHER";
export type MistakeId = string;

export interface MistakeOpts {
	actions: Action[],
	type: MistakeType,
	subtype: MistakeSubtype,
	registerId?: string,
	boundsCheck?: Bounds,
	boundsCorrect?: Bounds,
	boundsDiff: Bounds,
	correctText: string, // Used for word substring
	checkText: string,
}

export type MistakeHash = string;

export default class Mistake {
	actions: Action[] = [];

	type: MistakeType;

	subtype: MistakeSubtype;

	registerId?: string;

	boundsCheck?: Bounds;
	
	boundsCorrect?: Bounds;

	boundsDiff: Bounds;

	word?: string; // Defined only for subtype=WORD

	id: MistakeId;

	constructor(opts: MistakeOpts) {
		this.id = uuidv4();
		this.actions = opts.actions;
		this.type = opts.type;
		this.subtype = opts.subtype;
		this.registerId = opts.registerId;
		this.boundsCheck = opts.boundsCheck;
		this.boundsCorrect = opts.boundsCorrect;
		this.boundsDiff = opts.boundsDiff;
		
		if (this.subtype === "WORD") {
			if (this.type === "ADD") {
				this.word = opts.correctText.substring(this.boundsCorrect!.start, this.boundsCorrect!.end);
			} else {
				this.word = opts.checkText.substring(this.boundsCheck!.start, this.boundsCheck!.end);
			}
		}

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