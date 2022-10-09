import { ActionData, ActionSubtype, ActionType, Bounds, MistakeHash, MistakeId, MistakeSubtype, MistakeType, type ActionID } from "@shared/diff-engine";
import { SubmissionID, SubmissionState, UUID, type RegisterEntryMistake } from "./";

// A generalized mistake that can represent the same mistake across submissions
// boundsDiff and boundsCheck are submission-specific, so are stored with the submission
export interface MistakeStore<Type_ID> {
	id: MistakeId,
	hash: MistakeHash,
	type: MistakeType,
	subtype: MistakeSubtype,
	actions: MistakeStoreAction[],
	boundsCorrect: Bounds,
	word: string,
	wordCorrect?: string,
	children: Type_ID[],
	mergedId: MistakeId | null
	workspace: UUID,
}

export interface MistakeStoreAction {
	id: ActionID;
	type: ActionType;
	subtype: ActionSubtype;
	indexCorrect: number;
	char: string;
}

// A variation of Submission that stores only IDs of Mistakes, as Mistakes will be stored in their own document.
export interface SubmissionStore<Type_ID> {
	id: SubmissionID,
	state: SubmissionState,
	data: {
		text: string,
		ignoreText: Bounds[],
		mistakes: SubmissionStoreMistake<Type_ID>[],
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

export interface SubmissionStoreMistake<Type_ID> {
	id: Type_ID,
	hash: MistakeHash,
	boundsDiff: Bounds,
	boundsCheck: Bounds,
	actions: SubmissionStoreMistakeAction[],
	children: {
		id: Type_ID,
		boundsDiff: Bounds,
		boundsCheck: Bounds,
		actions: SubmissionStoreMistakeAction[]
	}[]
}

export interface SubmissionStoreMistakeAction {
	indexCheck: number,
	indexDiff: number
}

export interface RegisterStore<Type_ID>  {
	id: UUID,
	mistakes: RegisterEntryMistake[],
	description: string,
	ignore: boolean,
	workspace: UUID
}

// A variation of Workspace that stores only IDs, as Submissions will be stored in their own document.
export interface WorkspaceStore<Type_ID> {
	id: UUID,
	name: string,
	template: string,
	submissions: Type_ID[],
	register: Type_ID[],
}
