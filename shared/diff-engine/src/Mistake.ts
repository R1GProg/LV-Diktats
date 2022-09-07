import type { Action } from "./Action";
import { Bounds } from "./langUtil";
import { hash } from "./xxhash";
import { v4 as uuidv4 } from "uuid";
import { DiffChar } from ".";
import { getMaxElement, getMinElement } from "./util";

export type MistakeType = "ADD" | "DEL" | "MIXED";
export type MistakeSubtype = "WORD" | "OTHER" | "MERGED";
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
	// correctText: string, // Used for word substring
	// checkText: string,
}

export type MistakeHash = string;

export class Mistake {
	actions: Action[] = [];

	type: MistakeType;

	subtype: MistakeSubtype;

	registerId?: string;

	isRegistered: boolean;

	boundsCheck: Bounds | null;
	
	boundsCorrect: Bounds | null;

	boundsDiff: Bounds;

	word: string;

	id: MistakeId;

	private cachedHash: string | null = null;

	constructor(opts: MistakeOpts) {
		this.id = uuidv4();
		this.actions = opts.actions;
		this.type = opts.type;
		this.subtype = opts.subtype;
		this.registerId = opts.registerId;
		this.boundsCheck = opts.boundsCheck ?? null;
		this.boundsCorrect = opts.boundsCorrect ?? null;
		this.boundsDiff = opts.boundsDiff;
		this.isRegistered = false;

		if (!opts.word && this.subtype === "OTHER") {
			this.word = this.actions.map((a) => a.char).join();
			this.word = this.word.replace(/\n/g, "\\n");

			if (this.word === " ") this.word = "\" \"";
		} else {
			this.word = opts.word!;
		}
		
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

	async genHash(force = false): Promise<MistakeHash> {
		if (this.cachedHash && !force) return this.cachedHash;

		const actionCopy = [...this.actions];
		actionCopy.sort((a, b) => a.indexDiff - b.indexDiff); // Sorting by indexDiff, as the order should always be consistent
		const hashPromises = actionCopy.map((a) => a.hash);
		const hashData = (await Promise.all(hashPromises)).join("");
		const enc = new TextEncoder();

		const mHash = await hash(enc.encode(hashData));

		this.cachedHash = mHash;
		return mHash;
	}

	static mergeMistakes(...mistakes: Mistake[]) {
		const actions = mistakes.flatMap((m) => m.actions);
		actions.sort((a, b) => a.indexDiff - b.indexDiff);

		const inputTypes = mistakes.map((m) => m.type);
		const type = inputTypes.every((t) => t === "ADD") ? "ADD" : (inputTypes.every((t) => t === "DEL") ? "DEL" : "MIXED");

		const inputSubtypes = mistakes.map((m) => m.subtype);
		const subtype = inputSubtypes.every((m) => m === "WORD") ? "WORD" : "MERGED";

		let boundsCheck: Bounds | null = null;

		if (type !== "ADD") {
			const inputBoundsCheck = mistakes.map((m) => m.boundsCheck).filter((b) => b !== null) as Bounds[];
			boundsCheck = {
				start: getMinElement<Bounds>(inputBoundsCheck, (b) => b.start).start,
				end: getMaxElement<Bounds>(inputBoundsCheck, (b) => b.end).end
			}
		}

		let boundsCorrect: Bounds | null = null;

		if (type !== "DEL") {
			const inputBoundsCorrect = mistakes.map((m) => m.boundsCorrect).filter((b) => b !== null) as Bounds[];
			boundsCorrect = {
				start: getMinElement<Bounds>(inputBoundsCorrect, (b) => b.start).start,
				end: getMaxElement<Bounds>(inputBoundsCorrect, (b) => b.end).end
			}
		}

		const inputBoundsDiff = mistakes.map((m) => m.boundsDiff);
		const boundsDiff: Bounds = {
			start: getMinElement<Bounds>(inputBoundsDiff, (b) => b.start).start,
			end: getMaxElement<Bounds>(inputBoundsDiff, (b) => b.end).end
		}

		const word = mistakes.map((m) => m.word).join(" ");

		return new Mistake({
			type,
			subtype,
			actions,
			boundsCheck,
			boundsCorrect,
			boundsDiff,
			word
		});
	}
}