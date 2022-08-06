// All the exportable types are here because Svelte is being weird about importing shit from .ts files from other .ts files

export interface EssayEntry {
	id: string,
	text: string,
}

export type ActionHash = string;

export interface ActionDescriptor {
	desc: string,
}

export type ActionType = "ADD" | "DEL" | "SUB" | "NONE";
export type ActionSubtype = "PUNCT" | "ORTHO" | "SPACE";
export type WordType = "ADD" | "DEL" | "ERR";

export interface Action {
	id: string, // UUIDv4
	type: ActionType,
	subtype: ActionSubtype,
	indexCheck: number,
	indexCorrect: number,
	indexDiff?: number,
	char: string, // The character to delete, to add, or to substitute with, depending on the action type
	charBefore?: string, // Defined only for type=SUB
	wordIndex?: number, // Defined only for subtype=ORTHO
	inRegister?: boolean,
}

export interface Word {
	type: WordType,
	boundsCheck?: [number, number], // Defined only for type=ERR and type=DEL
	boundsCorrect?: [number, number], // Defined only for type=ADD and type=ERR
	// indexDiff: number,
	word: string,
	wordCorrect?: string, // Defined only for type=ERR
	actions: Action[],
}
