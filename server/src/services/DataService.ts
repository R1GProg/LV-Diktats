// Divdabis - The #1 Diktify Database Management Service

import * as config from "../../config.json";
import mongoose from "mongoose";
import { parentPort, MessagePort, TransferListItem } from "worker_threads";
import { Logger, LogLevel } from "yatsl";
import { AddRegisterMessagePayload, ChangeRegisterMessagePayload, ChangeSubmissionStateMessagePayload, ChangeSubmissionTextIgnoreMessagePayload, ChannelInitMessagePayload, DeleteRegisterMessagePayload, MergeMistakesMessagePayload, Message, MessageType, QuerySubmissionMessagePayload, QueryWorkspaceListMessagePayload, QueryWorkspaceMessagePayload, RegenSubmissionsMessagePayload, RegisterUpdatedMessagePayload, SubmissionDataMessagePayload, SubmissionStateChangedMessagePayload, UnmergeMistakesMessagePayload, WorkspaceDataMessagePayload, WorkspaceListMessagePayload } from "./types/MessageTypes";
import { deleteRegister, fetchSubmissionByID, getWorkspace, insertRegisterEntry, listWorkspaces, mergeMistakesByHash, registerLogger, unmergeMistakesByHash, updateRegisterByID, updateSubmissionIgnoreTextByID, updateSubmissionStateByID } from "../controllers/DatabaseController";
import { RegisterUpdateEventType } from "@shared/api-types";

const name = config.serviceNames.data;
const logger = new Logger({
	minLevel: parseInt(process.env["LOGLEVEL"] as string) as LogLevel | undefined,
	name: name
});

if (!parentPort) {
	logger.error("This service cannot be run standalone. Please run index.ts.");
	process.exit();
}

registerLogger(logger);

let currentPort: MessagePort | null = null;

// Sets the thread up to listen to ports.
function handlePortMessage(message: Message) {
	switch (message.type) {
		case MessageType.QUERY_WORKSPACES:
			handleQueryWorkspaceList(message.payload as QueryWorkspaceListMessagePayload);
			break;
		case MessageType.QUERY_WORKSPACE:
			handleQueryWorkspace(message.payload as QueryWorkspaceMessagePayload);
			break;
		case MessageType.QUERY_SUBMISSION:
			handleQuerySubmission(message.payload as QuerySubmissionMessagePayload);
			break;
		case MessageType.CHANGE_SUBMISSION_STATE:
			handleChangeSubmissionState(message.payload as ChangeSubmissionStateMessagePayload);
			break;
		case MessageType.MODIFY_TEXT_IGNORE:
			handleModifyTextIgnore(message.payload as ChangeSubmissionTextIgnoreMessagePayload);
			break;
		case MessageType.ADD_REGISTER_ENTRY:
			handleAddRegisterEntry(message.payload as AddRegisterMessagePayload);
			break;
		case MessageType.EDIT_REGISTER_ENTRY:
			handleEditRegisterEntry(message.payload as ChangeRegisterMessagePayload);
			break;
		case MessageType.DELETE_REGISTER_ENTRY:
			handleDeleteRegisterEntry(message.payload as DeleteRegisterMessagePayload);
			break;
		case MessageType.MERGE_MISTAKES:
			handleMergeMistakes(message.payload as MergeMistakesMessagePayload);
			break;
		case MessageType.UNMERGE_MISTAKES:
			handleUnmergeMistakes(message.payload as UnmergeMistakesMessagePayload);
			break;
		default:
			logger.warn(`${message.origin} sent message of unknown type! Ignoring...`);
			break;
	}
}
function handleChannelInit(payload: ChannelInitMessagePayload) {
	const messagingPort = payload.port;
	currentPort = messagingPort;
	messagingPort.on("message", (message: Message) => {
		handlePortMessage(message);
	});
	logger.log("Port successfully registered!");
}

async function handleQueryWorkspaceList(payload: QueryWorkspaceListMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const workspaces = await listWorkspaces();
	currentPort?.postMessage({
		origin: name,
		type: MessageType.WORKSPACE_LIST,
		payload: {
			id: payload.id,
			workspaces
		} as WorkspaceListMessagePayload
	});
}
async function handleQueryWorkspace(payload: QueryWorkspaceMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const workspace = await getWorkspace(payload.workspaceId);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.WORKSPACE_DATA,
		payload: {
			id: payload.id,
			workspace
		} as WorkspaceDataMessagePayload
	});
}
async function handleQuerySubmission(payload: QuerySubmissionMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const submission = await fetchSubmissionByID(payload.submissionId, payload.workspaceId);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.SUBMISSION_DATA,
		payload: {
			id: payload.id,
			submission
		} as SubmissionDataMessagePayload
	});
}
async function handleChangeSubmissionState(payload: ChangeSubmissionStateMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const success = await updateSubmissionStateByID(payload.submissionId, payload.workspaceId, payload.newState);
	if (!success) return logger.error("Updating submission state failed!");
	currentPort?.postMessage({
		origin: name,
		type: MessageType.SUBMISSION_STATE_CHANGED,
		payload: {
			workspaceId: payload.workspaceId,
			submissionId: payload.submissionId,
			newState: payload.newState
		} as SubmissionStateChangedMessagePayload
	});
}
async function handleModifyTextIgnore(payload: ChangeSubmissionTextIgnoreMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const success = await updateSubmissionIgnoreTextByID(payload.submissionId, payload.workspaceId, payload.newIgnoreText);
	if (!success) return logger.error("Updating submission ignoreText failed!");
	currentPort?.postMessage({
		origin: name,
		type: MessageType.REGEN_SUBMISSIONS,
		payload: {
			workspaceId: payload.workspaceId,
			submissionsToRegen: [payload.submissionId]
		} as RegenSubmissionsMessagePayload
	});
}
async function handleAddRegisterEntry(payload: AddRegisterMessagePayload) {
	try {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
		const register = await insertRegisterEntry(payload.registerEntry, payload.workspaceId);
		if (!register) return logger.error("Adding RegisterEntry failed!");
		const message: Message = {
			origin: name,
			type: MessageType.REGISTER_UPDATED,
			payload: {
				workspaceId: payload.workspaceId,
				entry: register,
				type: "ADD"
			} as RegisterUpdatedMessagePayload
		};
		currentPort?.postMessage(JSON.stringify(message)); // Shitty workaround for the fact that for some reason Register Updated messages refuses to send
	} catch (e) {
		logger.error(e);
	}
}
async function handleEditRegisterEntry(payload: ChangeRegisterMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const result = await updateRegisterByID(payload.registerEntry, payload.workspaceId);
	if (!result) return logger.error("Editing RegisterEntry failed!");
	const message: Message = {
		origin: name,
		type: MessageType.REGISTER_UPDATED,
		payload: {
			workspaceId: payload.workspaceId,
			entry: result,
			type: "EDIT" as RegisterUpdateEventType
		} as RegisterUpdatedMessagePayload
	};
	currentPort?.postMessage(JSON.stringify(message));
}
async function handleDeleteRegisterEntry(payload: DeleteRegisterMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const result = await deleteRegister(payload.registerId, payload.workspaceId);
	if (!result) return logger.error("Deleting RegisterEntry failed!");
	const message: Message = {
		origin: name,
		type: MessageType.REGISTER_UPDATED,
		payload: {
			workspaceId: payload.workspaceId,
			entry: result,
			type: "DELETE" as RegisterUpdateEventType
		} as RegisterUpdatedMessagePayload
	};
	currentPort?.postMessage(JSON.stringify(message));
}
async function handleMergeMistakes(payload: MergeMistakesMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const affectedSubmissions = await mergeMistakesByHash(payload.hashes, payload.workspaceId);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.REGEN_SUBMISSIONS,
		payload: {
			workspaceId: payload.workspaceId,
			submissionsToRegen: affectedSubmissions
		} as RegenSubmissionsMessagePayload
	});
}
async function handleUnmergeMistakes(payload: UnmergeMistakesMessagePayload) {
	if (!currentPort) return logger.error("No port registered, unable to process message!");
	const affectedSubmissions = await unmergeMistakesByHash(payload.hash, payload.workspaceId);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.REGEN_SUBMISSIONS,
		payload: {
			workspaceId: payload.workspaceId,
			submissionsToRegen: affectedSubmissions
		} as RegenSubmissionsMessagePayload
	});
}

// Parent thread message handler
parentPort.on("message", (message: Message) => {
	switch (message.type) {
		case MessageType.CHANNEL_INIT:
			handleChannelInit(message.payload as ChannelInitMessagePayload);
			break;
		default:
			logger.warn(`${message.origin} sent message of unknown type! Ignoring...`);
	}
});

mongoose.connect(`mongodb+srv://admin:${process.env["DBPASS"]}@diktatify.hpuzt56.mongodb.net/${config.dbName}?retryWrites=true&w=majority`, {}).catch((e) => {
	logger.error(e);
}).then(() => {
	logger.info("Connected to MongoDB!");
});

