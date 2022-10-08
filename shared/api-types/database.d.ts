import { ActionData, ActionSubtype, ActionType, Bounds, MistakeHash, MistakeId, MistakeSubtype, MistakeType } from "@shared/diff-engine";
import { SubmissionID, SubmissionState, UUID } from "./";

export interface ActionStore<Type_ID> {
	id: string,
	type: ActionType,
	subtype: ActionSubtype,
	indexCheck: number,
	indexCorrect: number,
	indexDiff: number,
	char: string,
	workspace: UUID
}

// A variation of Mistake that stores only IDs of Actions, as Actions will be stored in their own document.
export interface MistakeStore<Type_ID> {
	id: MistakeId,
	hash: MistakeHash,
	type: MistakeType,
	subtype: MistakeSubtype,
	actions: ActionData[],
	boundsCheck: Bounds,
	boundsCorrect: Bounds,
	boundsDiff: Bounds,
	word: string,
	wordCorrect?: string,
	children: Type_ID[],
	mergedId: MistakeId | null
	workspace: UUID,
}

export interface RegisterStore<Type_ID>  {
	id: UUID,
	mistakes: MistakeHash[],
	description: string,
	ignore: boolean,
	count: number,
	workspace: UUID
}

// A variation of Submission that stores only IDs of Mistakes, as Mistakes will be stored in their own document.
export interface SubmissionStore<Type_ID> {
	id: SubmissionID,
	state: SubmissionState,
	data: {
		text: string,
		ignoreText: Bounds[],
		mistakes: Type_ID[],
		metadata: {
			age: number,
			language: string,
			language_other: string,
			level: string,
			degree: string,
			country: string,
			city: string
		}
	},
	workspace: UUID
}

// A variation of Workspace that stores only IDs, as Submissions will be stored in their own document.
export interface WorkspaceStore<Type_ID> {
	id: UUID;
	name: string;
	template: string;
	submissions: Type_ID[];
	register: Type_ID[];
	mergedMistakes: MistakeHash[][]; // Hashes of mistakes that have been merged.
}
