import type { MistakeHash } from "@shared/diff-engine/Mistake";

export interface EssayEntry {
	id: string,
	text: string | null,
}

export interface Workspace {
	name: string,
	key: string,
	dataset: Record<string, EssayEntry>,
	register: Record<MistakeHash, RegisterEntry>,
	template: string,
	local: boolean,
}

export interface RegisterEntry {
	desc: string,
	ignore: boolean,
	word: string,
	wordCorrect: string,
}

export type RegisterEntryAction = "ADD" | "DELETE" | "EDIT";

export interface RegisterEntryData {
	data: RegisterEntry,
	action: RegisterEntryAction,
}
