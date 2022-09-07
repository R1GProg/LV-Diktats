import type { MistakeType } from "@shared/diff-engine";
import type { Bounds } from "@shared/diff-engine/build/esm/langUtil";
import type { MistakeHash } from "@shared/diff-engine/Mistake";

export interface EssayEntry {
	id: string,
	text: string | null,
	mistakes?: MistakeHash[]
}

export interface PregenMistake {
	actions: Action[],
	boundsCheck: Bounds,
	boundsCorrect: Bounds,
	boundsDiff: Bounds,
	hash: MistakeHash,
	ocurrences: number,
	type: MistakeType,
	workspace: string,
}

export interface Workspace {
	name: string,
	key: string,
	dataset: Record<string, EssayEntry>,
	register: Record<MistakeHash, RegisterEntry>,
	template: string,
	local: boolean,
	mistakeData?: PregenMistake[]
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
