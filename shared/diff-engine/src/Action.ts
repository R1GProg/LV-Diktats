import { v4 as uuidv4 } from "uuid";
import type { Mistake } from "./Mistake";
import { hash } from "./xxhash";
export type ActionType = "ADD" | "DEL" | "SUB" | "NONE";
export type ActionSubtype = "PUNCT" | "ORTHO" | "SPACE";

export interface ActionOpts {
	type: ActionType,
	indexCheck: number,
	indexCorrect: number,
	char: string,
	subtype: ActionSubtype,
	indexDiff?: number,
	charCorrect?: string,
	mistake?: Mistake,
}

export type ActionHash = string;

export default class Action {
	id: string;
	
	type: ActionType;
	
	subtype: ActionSubtype;
	
	indexCheck: number;
	
	indexCorrect: number;
	
	indexDiff: number = -1; // indexDiff=-1 if the action hasn't yet been run through post-processing
	
	char: string;
	
	charCorrect?: string;

	hash: Promise<ActionHash>;

	mistake?: Mistake;

	constructor(opts: ActionOpts) {
		this.id = uuidv4();

		this.type = opts.type;
		this.subtype = opts.subtype;
		this.indexCheck = opts.indexCheck;
		this.indexCorrect = opts.indexCorrect;
		this.char = opts.char;

		this.charCorrect = opts.charCorrect;
		this.mistake = opts.mistake;

		this.hash = this.genHash();
	}

	async genHash(): Promise<ActionHash> {
		if (this.hash) return this.hash;

		const dict: Record<ActionType, number> = {
			"NONE": 0,
			"ADD": 1,
			"DEL": 2,
			"SUB": 3,
		}
	
		const keyObject = {
			type: dict[this.type],
			index: this.indexCorrect,
			char: this.char.trim().charCodeAt(0)
		};
	
		const dataBuf = Uint8Array.from(Object.values(keyObject));	
		return hash(dataBuf);
	}
}