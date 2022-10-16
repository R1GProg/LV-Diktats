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
	splitFrom?: MistakeHash | null,
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

	splitFrom: MistakeHash | null = null; // Used when a mistake is split

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
			splitFrom: this.splitFrom
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
		
		// Both include MIXED mistakes
		const delMistakes = mistakes.filter((m) => m.type !== "ADD");
		const addMistakes = mistakes.filter((m) => m.type !== "DEL");

		const checkMistakeArr = delMistakes.length === 0 ? mistakes : delMistakes;
		const correctMistakeArr = addMistakes.length === 0 ? mistakes : addMistakes;

		const boundsCheck = {
			start: Math.min(...(checkMistakeArr.map((m) => m.boundsCheck.start))),
			end: Math.max(...(checkMistakeArr.map((m) => m.boundsCheck.end)))
		};

		const boundsCorrect = {
			start: Math.min(...(correctMistakeArr.map((m) => m.boundsCorrect.start))),
			end: Math.max(...(correctMistakeArr.map((m) => m.boundsCorrect.end)))
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

		m.splitFrom = data.splitFrom ?? null;
		m.id = data.id;

		return m;
	}

	static splitMixed(m: MistakeData): { add: Mistake, del: Mistake } | null {
		if (m.type !== "MIXED") return null;

		const delBoundsDiff = {
			start: m.boundsDiff.start,
			end: m.boundsDiff.start + m.word.length
		}

		const addBoundsDiff = {
			start: delBoundsDiff.end,
			end: delBoundsDiff.end + m.wordCorrect!.length
		}

		const add = new Mistake({
			type: "ADD",
			subtype: m.subtype,
			word: m.wordCorrect!,
			actions: [],
			boundsCheck: { start: m.boundsCheck.start, end: m.boundsCheck.end },
			boundsCorrect: {...m.boundsCorrect},
			boundsDiff: addBoundsDiff
		});

		const del = new Mistake({
			type: "DEL",
			subtype: m.subtype,
			word: m.word,
			actions: [],
			boundsCheck: {...m.boundsCheck},
			boundsCorrect: { start: m.boundsCorrect.start, end: m.boundsCorrect.end },
			boundsDiff: delBoundsDiff
		});

		add.splitFrom = m.hash;
		del.splitFrom = m.hash;

		return { del, add };
	}
}

/*
{
    "id": "499db4a8-c38c-42d7-829f-31bffe0022cc",
    "hash": "e19c93e274efd9b7",
    "type": "MIXED",
    "subtype": "WORD",
    "actions": [
        {
            "id": "b6971be5-ecfe-4ea7-a0c4-abfde81ec4fe",
            "type": "ADD",
            "subtype": "ORTHO",
            "indexCheck": 2,
            "indexCorrect": 2,
            "indexDiff": 2,
            "char": "s"
        },
        {
            "id": "4ac18d63-6d9c-4dbf-93d8-9e94593e043a",
            "type": "DEL",
            "subtype": "ORTHO",
            "indexCheck": 2,
            "indexCorrect": 3,
            "indexDiff": 3,
            "char": "z"
        }
    ],
    "boundsCheck": {
        "start": 1255,
        "end": 1260
    },
    "boundsCorrect": {
        "start": 1270,
        "end": 1275
    },
    "boundsDiff": {
        "start": 1291,
        "end": 1297
    },
    "word": "Lūzti",
    "wordCorrect": "Lūsti",
    "children": [],
    "mergedId": null
}

*/