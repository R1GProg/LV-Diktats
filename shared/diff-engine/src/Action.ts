import { v4 as uuidv4 } from "uuid";
import { hash } from "./xxhash";
export type ActionType = "ADD" | "DEL";
export type ActionSubtype = "PUNCT" | "ORTHO" | "SPACE";

export interface ActionOpts {
	type: ActionType,
	indexCheck: number,
	indexCorrect: number,
	char: string,
	subtype: ActionSubtype,
	indexDiff?: number,
}

export type ActionHash = string;

export class Action {
	id: string;
	
	type: ActionType;
	
	subtype: ActionSubtype;
	
	indexCheck: number;
	
	indexCorrect: number;
	
	indexDiff?: number; // Defined only for type=DEL

	char: string;

	hash: Promise<ActionHash>;

	constructor(opts: ActionOpts) {
		this.id = uuidv4();

		this.type = opts.type;
		this.subtype = opts.subtype;
		this.indexCheck = opts.indexCheck;
		this.indexCorrect = opts.indexCorrect;
		this.indexDiff = opts.indexDiff;
		this.char = opts.char;

		this.hash = this.genHash();
	}

	async genHash(): Promise<ActionHash> {
		if (this.hash) return this.hash;

		const dict: Record<ActionType, number> = {
			"DEL": 0,
			"ADD": 1,
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