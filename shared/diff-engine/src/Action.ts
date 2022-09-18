import { v4 as uuidv4 } from "uuid";
import { hash } from "./xxhash";
export type ActionType = "ADD" | "DEL";
export type ActionSubtype = "PUNCT" | "ORTHO" | "SPACE";
export type ActionID = string;

export interface ActionOpts {
	type: ActionType,
	indexCheck: number,
	indexCorrect: number,
	char: string,
	subtype: ActionSubtype,
	indexDiff?: number,
}

export interface ActionData {
	id: ActionID,
	type: ActionType,
	subtype: ActionSubtype,
	indexCheck: number,
	indexCorrect: number,
	indexDiff?: number,
	char: string
}

export type ActionHash = string;

export class Action {
	id: ActionID;
	
	type: ActionType;
	
	subtype: ActionSubtype;
	
	indexCheck: number;
	
	indexCorrect: number;
	
	indexDiff?: number; // Defined only for type=DEL

	char: string;

	constructor(opts: ActionOpts) {
		this.id = uuidv4();

		this.type = opts.type;
		this.subtype = opts.subtype;
		this.indexCheck = opts.indexCheck;
		this.indexCorrect = opts.indexCorrect;
		this.indexDiff = opts.indexDiff;
		this.char = opts.char;
	}

	exportData(): ActionData {
		return {
			id: this.id,
			type: this.type,
			subtype: this.subtype,
			indexCheck: this.indexCheck,
			indexCorrect: this.indexCorrect,
			indexDiff: this.indexDiff,
			char: this.char
		}
	}
}