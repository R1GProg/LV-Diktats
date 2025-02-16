import type {Bounds, MistakeData, MistakeHash } from "@shared/diff-engine";

export type UUID = string;
export type SubmissionID = string;

export type SubmissionState = "UNGRADED" | "REJECTED" | "WIP" | "DONE";
export type SettingsType = "STRING" | "NUMBER" | "NESTED";
export type UserRole = "NONE" | "EDITOR" | "ADMIN";
export type RegisterUpdateEventType = "ADD" | "ADD_VARIATION" | "EDIT" | "DELETE";

export interface Workspace {
	id: UUID,
	name: string,
	template: string,
	submissions: Record<SubmissionID, SubmissionPreview>,
	register: RegisterEntry[],
	local: boolean,
}

export interface WorkspacePreview {
	id: UUID,
	name: string,
}

export interface Submission {
	id: SubmissionID,
	state: SubmissionState,
	data: SubmissionData
}

export interface SubmissionPreview {
	id: SubmissionID,
	state: SubmissionState,
	mistakeCount: number,
	regMistakeCount?: number,
}

export interface RegisterEntry {
	id: UUID,
	mistakes: MistakeHash[],
	description: string,
	count: number,
	opts: RegisterOptions,
	_mistakeWords?: Record<MistakeHash, string>, // Temporary field for the debug dataset
}

export interface RegisterOptions {
	ignore: boolean,
	countType: "TOTAL" | "VARIATION" | "NONE",
	mistakeType: "ORTHO" | "PUNCT" | "TEXT"
}

// The uninitialized data (Not yet processed to DB), sent from client
export interface RegisterEntryData {
	action: RegisterUpdateEventType,
	id?: UUID,
	mistakes?: MistakeHash[],
	description?: string,
	opts?: RegisterOptions,
}

export interface Setting {
	id: UUID,
	key: string,
	name: string,
	type: SettingsType,
	value: any,
	min?: number,
	max?: number,
}

export interface User {
	user: string,
	pass: string,
	role: UserRole,
}

export interface RequestSubmissionEventData {
	id: SubmissionID,
	workspace: UUID,
}

export interface RegisterNewEventData {
	data: RegisterEntry,
	workspace: UUID,
}

export interface RegisterEditEventData {
	id: UUID,
	workspace: UUID,
	data: RegisterEntry
}

export interface RegisterDeleteEventData {
	id: UUID,
	workspace: UUID
}

export interface MistakeMergeEventData {
	mistakes: MistakeHash[],
	workspace: UUID
}

export interface MistakeUnmergeEventData {
	mistake: MistakeHash,
	workspace: UUID,
}

export interface TextIgnoreEventData {
	id: SubmissionID,
	ignoreBounds: Bounds[],
	workspace: UUID
}

export interface SubmissionStateChangeEventData {
	id: SubmissionID,
	state: SubmissionState,
	workspace: UUID
}

export interface SubmissionDataEventData {
	id: SubmissionID,
	data: SubmissionData,
	state: SubmissionState,
	workspace: UUID
}

export interface RegisterUpdateEventData {
	data: RegisterUpdateEventEntryData[],
	workspace: UUID
}

export interface RegisterUpdateEventEntryData {
	entry: RegisterEntry,
	type: RegisterUpdateEventType
}

export interface SubmissionRegenEventData {
	ids: SubmissionID[],
	workspace: UUID
}

export interface SubmissionData {
	text: string,
	ignoreText: Bounds[],
	mistakes: MistakeData[],
	splitMistakes: MistakeHash[],
	metadata: {
		age?: number,
		language?: string,
		language_other?: string,
		level?: string,
		degree?: string,
		country?: string,
		city?: string,
		email?: string
	}
}

export interface ExportedSubmission {
	author: string,
	text: string,
	isRejected: boolean,
	mistakes: ExportedSubmissionMistake[]
}

export interface ExportedSubmissionMistake {
	id: string,
	mistakeType: ExportedSubmissionMistakeType,
	bounds: ExportedSubmissionMistakeBounds[],
	description: string,
	submissionStatistic: number,
	percentage: number,
	typeCounter: { ortho: number, punct: number }
}

export interface ExportedSubmissionMistakeBounds {
	type: "ADD" | "DEL",
	bounds: Bounds,
	content: string
}

export type ExportedSubmissionMistakeType = "ORTHO" | "PUNCT" | "TEXT";