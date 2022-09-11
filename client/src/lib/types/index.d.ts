import type { MistakeType, Bounds, MistakeHash } from "@shared/diff-engine";

export interface EssayEntry {
	id: string,
	text: string | null,
	mistakes?: MistakeHash[],
	ignoredText: Bounds[]
}

export interface WorkspaceMistake {
	mistake: Mistake,
	hash: MistakeHash,
	occurrences: number,
	workspace: string,
}

export interface Workspace {
	name: string,
	key: string,
	dataset: Record<string, EssayEntry>,
	register: Record<MistakeHash, RegisterEntry>,
	template: string,
	local: boolean,
	mistakeData: WorkspaceMistake[]
}

export interface RegisterEntry {
	desc: string,
	ignore: boolean,
	word: string,
	wordCorrect: string,
	hash?: string,
}

export type RegisterEntryAction = "ADD" | "DELETE" | "EDIT";

export interface RegisterEntryData {
	data: RegisterEntry,
	action: RegisterEntryAction,
}
