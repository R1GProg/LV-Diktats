import type Action from "./Action";
import { Bounds } from "./langUtil";
import { hash } from "./xxhash";
import { v4 as uuidv4 } from "uuid";
import { DiffChar } from ".";

export type MistakeType = "ADD" | "DEL" | "MIXED";
export type MistakeSubtype = "WORD" | "OTHER";
export type MistakeId = string;

export interface MistakeOpts {
	actions: Action[],
	type: MistakeType,
	subtype: MistakeSubtype,
	registerId?: string,
	boundsCheck?: Bounds | null,
	boundsCorrect?: Bounds | null,
	boundsDiff: Bounds,
	word?: string,
	wordMeta?: DiffChar[],
	// correctText: string, // Used for word substring
	// checkText: string,
}

export type MistakeHash = string;

export default class Mistake {
	actions: Action[] = [];

	type: MistakeType;

	subtype: MistakeSubtype;

	registerId?: string;

	boundsCheck: Bounds | null;
	
	boundsCorrect: Bounds | null;

	boundsDiff: Bounds;

	word?: string; // Defined only for subtype=WORD

	id: MistakeId;

	wordMeta?: DiffChar[];

	constructor(opts: MistakeOpts) {
		this.id = uuidv4();
		this.actions = opts.actions;
		this.type = opts.type;
		this.subtype = opts.subtype;
		this.registerId = opts.registerId;
		this.boundsCheck = opts.boundsCheck ?? null;
		this.boundsCorrect = opts.boundsCorrect ?? null;
		this.boundsDiff = opts.boundsDiff;
		this.word = opts.word;
		this.wordMeta = opts.wordMeta;
		
		// if (this.subtype === "WORD") {
		// 	if (this.type === "DEL") {
		// 		this.word = opts.checkText.substring(this.boundsCheck!.start, this.boundsCheck!.end);
		// 	} else {
		// 		this.word = opts.correctText.substring(this.boundsCorrect!.start, this.boundsCorrect!.end);
		// 	}
		// }

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