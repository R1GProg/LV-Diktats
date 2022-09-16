import { Action } from "./Action";
import { hash } from "./xxhash";
import { v4 as uuidv4 } from "uuid";
import { getMaxElement, getMinElement } from "./util";

export type Bounds = { start: number, end: number };
export type MistakeType = "ADD" | "DEL" | "MIXED";
export type MistakeSubtype = "WORD" | "OTHER" | "MERGED";
export type MistakeId = string;

export interface MistakeOpts {
	actions?: Action[], // Used only for type=MIXED
	type: MistakeType,
	subtype: MistakeSubtype,
	registerId?: string,
	boundsCheck: Bounds, // 
	boundsCorrect: Bounds,
	boundsDiff: Bounds,
	word: string,
	wordCorrect?: string,
}

export type MistakeHash = string;

export class Mistake {
	actions: Action[] = [];

	type: MistakeType;

	subtype: MistakeSubtype;

	registerId?: string;

	boundsCheck: Bounds;
	
	boundsCorrect: Bounds;

	boundsDiff: Bounds;

	word: string;

	wordAfter?: string; // Defined only for type=MIXED

	id: MistakeId;

	private cachedHash: string | null = null;

	constructor(opts: MistakeOpts) {
		this.id = uuidv4();
		this.actions = opts.actions ?? [];
		this.type = opts.type;
		this.subtype = opts.subtype;
		this.registerId = opts.registerId;
		this.boundsCheck = opts.boundsCheck;
		this.boundsCorrect = opts.boundsCorrect;
		this.boundsDiff = opts.boundsDiff;
		this.word = opts.word;
		this.wordAfter = opts.wordCorrect;
	}

	async genHash(force = false): Promise<MistakeHash> {
		if (this.cachedHash && !force) return this.cachedHash;

		const hashData = {
			type: this.type,
			start: this.boundsCorrect.start,
			end: this.boundsCorrect.end,
			word: this.word
		};

		const enc = new TextEncoder();
		const mHash = await hash(enc.encode(JSON.stringify(hashData)));

		this.cachedHash = mHash;
		return mHash;
	}

	static mergeMistakes(...mistakes: Mistake[]) {
		console.warn("NYI");
		// const actions = mistakes.flatMap((m) => m.actions);
		// actions.sort((a, b) => a.indexDiff! - b.indexDiff!);

		// const inputTypes = mistakes.map((m) => m.type);
		// const type = inputTypes.every((t) => t === "ADD") ? "ADD" : (inputTypes.every((t) => t === "DEL") ? "DEL" : "MIXED");

		// const inputSubtypes = mistakes.map((m) => m.subtype);
		// const subtype = inputSubtypes.every((m) => m === "WORD") ? "WORD" : "MERGED";

		// let boundsCheck: Bounds | null = null;

		// if (type !== "ADD") {
		// 	const inputBoundsCheck = mistakes.map((m) => m.boundsCheck).filter((b) => b !== null) as Bounds[];
		// 	boundsCheck = {
		// 		start: getMinElement<Bounds>(inputBoundsCheck, (b) => b.start).start,
		// 		end: getMaxElement<Bounds>(inputBoundsCheck, (b) => b.end).end
		// 	}
		// }

		// let boundsCorrect: Bounds | null = null;

		// if (type !== "DEL") {
		// 	const inputBoundsCorrect = mistakes.map((m) => m.boundsCorrect).filter((b) => b !== null) as Bounds[];
		// 	boundsCorrect = {
		// 		start: getMinElement<Bounds>(inputBoundsCorrect, (b) => b.start).start,
		// 		end: getMaxElement<Bounds>(inputBoundsCorrect, (b) => b.end).end
		// 	}
		// }

		// const inputBoundsDiff = mistakes.map((m) => m.boundsDiff);
		// const boundsDiff: Bounds = {
		// 	start: getMinElement<Bounds>(inputBoundsDiff, (b) => b.start).start,
		// 	end: getMaxElement<Bounds>(inputBoundsDiff, (b) => b.end).end
		// }

		// const word = mistakes.map((m) => m.word).join(" ");

		// return new Mistake({
		// 	type,
		// 	subtype,
		// 	actions,
		// 	boundsCheck,
		// 	boundsCorrect,
		// 	boundsDiff,
		// 	word
		// });
	}

	static fromData(data: MistakeOpts & { id: string, word: string }) {
		const m = new Mistake(data);

		m.id = data.id;
		m.word = data.word;

		return m;
	}
}