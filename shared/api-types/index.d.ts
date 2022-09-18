import type { ActionSubtype, ActionType, Bounds, MistakeChild, MistakeData, MistakeHash, MistakeSubtype, MistakeType } from "@shared/diff-engine";

export type UUID = string;
export type SubmissionID = string;

export enum SubmissionState {
	UNGRADED = "UNGRADED",
	REJECTED = "REJECTED",
	WIP = "WIP",
	DONE = "DONE"
}

export enum SettingsType {
	STRING = "STRING",
	NUMBER = "NUMBER",
	NESTED = "NESTED"
}

export enum UserRole {
	NONE = "NONE",
	EDITOR = "EDITOR",
	ADMIN = "ADMIN"
}

export enum RegisterUpdateEventType {
	ADD = "ADD",
	EDIT = "EDIT",
	DELETE = "DELETE"
}

export interface Workspace {
	id: UUID,
	name: string,
	template: string,
	submissions: Record<SubmissionID, Submission>,
	register: RegisterEntry[]
}

export interface Submission {
	id: SubmissionID,
	state: SubmissionState,
	data: {
		text: string,
		ignoreText: Bounds[],
		mistakes: MistakeData[],
		metadata: {
			age: number,
			language: string,
			language_other: string,
			level: string,
			degree: string,
			country: string,
			city: string
		}
	} | null
}

export interface RegisterEntry {
	id: UUID,
	mistakes: MistakeHash[],
	description: string,
	ignore: boolean,
	count: number
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
	id: SubmissionID
}

export interface RegisterNewEventData {
	data: RegisterEntry
}

export interface RegisterEditEventData {
	id: UUID,
	data: RegisterEntry
}

export interface RegisterDeleteEventData {
	id: UUID
}

export interface MistakeMergeEventData {
	mistakes: MistakeHash[]
}

export interface MistakeUnmergeEventData {
	mistake: MistakeHash
}

export interface TextIgnoreEventData {
	ignoreBounds: Bounds[]
}

export interface SubmissionStateChangeEventData {
	id: SubmissionID,
	state: SubmissionState
}

export interface SubmissionDataEventData {
	data: SubmissionData
}

export interface RegisterUpdateEventData {
	id: UUID,
	data: RegisterEntry,
	type: RegisterUpdateEventType
}

export interface SubmissionRegenEventData {
	ids: SubmissionID[]
}

export interface SubmissionData {
	id: SubmissionID,
	text: string,
	ignoreText: Bounds[],
	mistakes: MistakeData[],
	metadata: {
		age: number,
		language: string,
		language_other: string,
		level: string,
		degree: string,
		country: string,
		city: string
	}
}
