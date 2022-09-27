import { RegisterEntry, RegisterUpdateEventType, Submission, SubmissionState, UUID, Workspace, WorkspacePreview } from '@shared/api-types';
import { Bounds } from '@shared/diff-engine';
import { MessagePort } from 'worker_threads';

export enum MessageType {
	// Main -> Child Types
	CHANNEL_INIT, // Provides the child with a port for a messaging channel
	// Networking -> Data Types
	QUERY_WORKSPACES, // Query a list of all workspaces
	QUERY_WORKSPACE, // Query a specific workspace
	QUERY_SUBMISSION, // Query a specific submission
	CHANGE_SUBMISSION_STATE, // Change submission state
	MODIFY_TEXT_IGNORE, // Modify submission's text ignore
	ADD_REGISTER_ENTRY, // Add register entry
	EDIT_REGISTER_ENTRY, // Edit register entry
	DELETE_REGISTER_ENTRY, // Delete register entry
	MERGE_MISTAKES, // Merge mistakes
	UNMERGE_MISTAKES, // Unmerge mistakes
	// Data -> Networking Types
	SUBMISSION_DATA, // Submission data has been retrieved
	REGEN_SUBMISSIONS, // These submissions should be regenerated
	SUBMISSION_STATE_CHANGED, // Submission's state has changed
	REGISTER_UPDATED, // Register has updated
	WORKSPACE_LIST, // A list of workspaces has been retrieved
	WORKSPACE_DATA // Workspace data has been retrieved
}

export interface MessagePayload { }

export interface Message {
	origin: string,
	type: MessageType,
	payload: MessagePayload
}

// Main -> Child Payloads
export interface ChannelInitMessagePayload extends MessagePayload {
	// TODO: Should I add a field to specify to which service the port goes? Might be handy if there's more than 2 services.
	port: MessagePort
}

// Networking -> Data Payloads
export interface QueryWorkspaceListMessagePayload extends MessagePayload {
	id: UUID // The ID of the requester, used by Networking service to figure out who to pass the response to
}
export interface QueryWorkspaceMessagePayload extends MessagePayload {
	id: UUID, // The ID of the requester, used by Networking service to figure out who to pass the response to
	workspaceId: string // The ID of the workspace being querried 
}
export interface QuerySubmissionMessagePayload extends MessagePayload {
	id: UUID, // The ID of the requester, used by Networking service to figure out who to pass the response to
	workspaceId: string,
	submissionId: string // The ID of the submission being querried 
}
export interface ChangeSubmissionStateMessagePayload extends MessagePayload {
	submissionId: string, // The ID of the submission being modified
	workspaceId: string,
	newState: SubmissionState
}
export interface ChangeSubmissionTextIgnoreMessagePayload extends MessagePayload {
	submissionId: string, // The ID of the submission being modified
	workspaceId: string,
	newIgnoreText: Bounds[]
}
export interface AddRegisterMessagePayload extends MessagePayload {
	workspaceId: string,
	registerEntry: RegisterEntry
}
export interface ChangeRegisterMessagePayload extends MessagePayload {
	workspaceId: string,
	registerId: string,
	registerEntry: RegisterEntry
}
export interface DeleteRegisterMessagePayload extends MessagePayload {
	workspaceId: string,
	registerId: string
}
export interface MergeMistakesMessagePayload extends MessagePayload {
	workspaceId: string,
	hashes: string[]
}
export interface UnmergeMistakesMessagePayload extends MessagePayload {
	workspaceId: string,
	hash: string
}

// Data -> Networking Payloads
export interface SubmissionDataMessagePayload extends MessagePayload {
	id: UUID, // The ID of the requester, used by Networking service to figure out who to pass the response to
	submission: Submission // The ID of the submission being querried 
}
export interface RegenSubmissionsMessagePayload extends MessagePayload {
	workspaceId: string,
	submissionsToRegen: string[] // ID of submissions that need to be refetched
}
export interface SubmissionStateChangedMessagePayload extends MessagePayload {
	workspaceId: string,
	submissionId: string,
	newState: SubmissionState
}
export interface RegisterUpdatedMessagePayload extends MessagePayload {
	workspaceId: string,
	data: {
		entry: RegisterEntry,
		type: RegisterUpdateEventType
	}[]
}
export interface WorkspaceListMessagePayload extends MessagePayload {
	id: UUID,
	workspaces: WorkspacePreview[]
}
export interface WorkspaceDataMessagePayload extends MessagePayload {
	id: UUID,
	workspace: Workspace
}