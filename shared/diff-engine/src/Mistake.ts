import { Action, ActionData } from "./Action";
import { hash } from "./xxhash";
import { v4 as uuidv4 } from "uuid";

export type Bounds = { start: number, end: number };
export type MistakeType = "ADD" | "DEL" | "MIXED";
export type MistakeSubtype = "WORD" | "OTHER" | "MERGED";
export type MistakeId = string;

export interface MistakeOpts {
	actions?: Action[], // Used only for type=MIXED
	type: MistakeType,
	subtype: MistakeSubtype,
	boundsCheck: Bounds, // For type=ADD, start == end
	boundsCorrect: Bounds, // For type=DEL start == end
	boundsDiff: Bounds,
	word: string,
	wordCorrect?: string,
	children?: Mistake[] // Used only when creating subtype=MERGED
}

export interface MistakeData {
	id: MistakeId,
	hash: MistakeHash
	type: MistakeType,
	subtype: MistakeSubtype,
	actions: ActionData[],
	boundsCheck: Bounds,
	boundsCorrect: Bounds,
	boundsDiff: Bounds,
	word: string,
	wordCorrect?: string,
	children: MistakeData[],
	mergedId: MistakeId | null,
}

export type MistakeHash = string;

export class Mistake {
	actions: Action[] = [];

	type: MistakeType;

	subtype: MistakeSubtype;

	boundsCheck: Bounds;
	
	boundsCorrect: Bounds;

	boundsDiff: Bounds;

	word: string;

	wordCorrect?: string; // Defined only for type=MIXED

	id: MistakeId;

	children: Mistake[] = []; // Populated only for subtype=MERGED

	mergedId: MistakeId | null = null; // Used only for children of a merged mistake

	private cachedHash: string | null = null;

	constructor(opts: MistakeOpts) {
		this.id = uuidv4();
		this.actions = opts.actions ?? [];
		this.type = opts.type;
		this.subtype = opts.subtype;
		this.boundsCheck = opts.boundsCheck;
		this.boundsCorrect = opts.boundsCorrect;
		this.boundsDiff = opts.boundsDiff;
		this.word = opts.word;
		this.wordCorrect = opts.wordCorrect;
		this.children = opts.children ?? [];

		if (this.subtype === "MERGED") {
			for (const m of this.children) {
				m.mergedId = this.id;
			}
		}
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

	async exportData(): Promise<MistakeData> {
		return {
			id: this.id,
			hash: await this.genHash(),
			type: this.type,
			subtype: this.subtype,
			actions: this.actions.map((a) => a.exportData()),
			boundsCheck: this.boundsCheck,
			boundsCorrect: this.boundsCorrect,
			boundsDiff: this.boundsDiff,
			word: this.word,
			wordCorrect: this.wordCorrect,
			children: await Promise.all(this.children.map((m) => m.exportData())),
			mergedId: this.mergedId,
		}
	}

	static mergeMistakes(...mistakes: Mistake[]) {
		// Unwrap all previously merged mistakes
		mistakes.forEach((m, i) => {
			if (m.subtype !== "MERGED") return;

			mistakes.splice(i, 1);
			mistakes.push(...Mistake.unmergeMistake(m));
		});

		mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

		const mergedActions = mistakes.flatMap((m) => m.actions);
		mergedActions.sort((a, b) => a.indexDiff - b.indexDiff);

		const isAdd = mistakes.every((m) => m.type === "ADD");
		const isDel = mistakes.every((m) => m.type === "DEL");

		const type: MistakeType = isAdd ? "ADD" : (isDel ? "DEL" : "MIXED");
		
		const boundsCheck = {
			start: Math.min(...mistakes.map((m) => m.boundsCheck.start)),
			end: Math.max(...mistakes.map((m) => m.boundsCheck.end))
		};

		const boundsCorrect = {
			start: Math.min(...mistakes.map((m) => m.boundsCorrect.start)),
			end: Math.max(...mistakes.map((m) => m.boundsCorrect.end))
		};

		const boundsDiff = {
			start: Math.min(...mistakes.map((m) => m.boundsDiff.start)),
			end: Math.max(...mistakes.map((m) => m.boundsDiff.end))
		};

		const word = mistakes.map((m) => m.word).join("..");
		const wordCorrect = mistakes
			.filter((m) => m.type !== "DEL")
			.map((m) => m.type === "ADD" ? m.word : m.wordCorrect)
			.join("..");

		const children = [...mistakes];
		children.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

		return new Mistake({
			actions: mergedActions,
			type,
			subtype: "MERGED",
			boundsCheck,
			boundsCorrect,
			boundsDiff,
			word,
			wordCorrect,
			children
		});
	}

	static unmergeMistake(mergedMistake: Mistake): Mistake[] {
		if (mergedMistake.subtype !== "MERGED") {
			console.warn("Attempt to unmerge a non-merged mistake");
			return [ mergedMistake ];
		}

		const children = [...mergedMistake.children];
		
		for (const m of children) {
			m.mergedId = null;
		}

		return children;
	}

	static fromData(data: MistakeData): Mistake {
		const m = new Mistake({
			...data,
			actions: data.actions.map((a) => Action.fromData(a)),
			children: data.subtype === "MERGED" ? data.children.map((m) => Mistake.fromData(m)) : []
		});

		m.id = data.id;

		return m;
	}
}