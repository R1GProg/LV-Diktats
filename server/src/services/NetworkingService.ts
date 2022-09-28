// Saiklis - The #1 Diktify Connection Management Service

import * as config from "../../config.json";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Logger, LogLevel } from "yatsl";
import { registerHandler } from "../controllers/WebsocketController";
import { workspaceRouter } from "../routes/workspace";
import { parentPort, MessagePort } from "worker_threads";
import { AddRegisterMessagePayload, ChangeRegisterMessagePayload, ChangeSubmissionStateMessagePayload, ChangeSubmissionTextIgnoreMessagePayload, ChannelInitMessagePayload, DeleteRegisterMessagePayload, MergeMistakesMessagePayload, Message, MessageType, QuerySubmissionMessagePayload, QueryWorkspaceListMessagePayload, QueryWorkspaceMessagePayload, RegenSubmissionsMessagePayload, RegisterUpdatedMessagePayload, SubmissionDataMessagePayload, SubmissionStateChangedMessagePayload, UnmergeMistakesMessagePayload, WorkspaceDataMessagePayload, WorkspaceListMessagePayload } from "./types/MessageTypes";
import { RegisterEntry, RegisterUpdateEventData, Submission, SubmissionRegenEventData, SubmissionState, SubmissionStateChangeEventData, UUID, Workspace } from "@shared/api-types";
import { v4 as uuidv4 } from "uuid";
import { Bounds } from "@shared/diff-engine";

const name = config.serviceNames.network;
export const logger = new Logger({
	minLevel: parseInt(process.env["LOGLEVEL"] as string) as LogLevel | undefined,
	name: name
});

if (!parentPort) {
	logger.error("This service cannot be run standalone. Please run index.ts.");
	process.exit();
}

let currentPort: MessagePort | null = null;
const awaitingRequests: Record<UUID, { (...args: any[]): void; }> = {}; // Requests waiting for a response from Divdabis

export function requestWorkspaceList(callback: { (list: string[]): void }) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	const reqId = uuidv4();
	awaitingRequests[reqId] = callback;
	currentPort?.postMessage({
		origin: name,
		type: MessageType.QUERY_WORKSPACES,
		payload: {
			id: reqId
		} as QueryWorkspaceListMessagePayload
	});
}
export function requestWorkspaceData(workspace: string, callback: { (data: Workspace): void }) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	const reqId = uuidv4();
	awaitingRequests[reqId] = callback;
	currentPort?.postMessage({
		origin: name,
		type: MessageType.QUERY_WORKSPACE,
		payload: {
			id: reqId,
			workspaceId: workspace
		} as QueryWorkspaceMessagePayload
	});
}
export function requestSubmissionData(submission: string, workspace: string, callback: { (data: Submission): void }) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	const reqId = uuidv4();
	awaitingRequests[reqId] = callback;
	currentPort?.postMessage({
		origin: name,
		type: MessageType.QUERY_SUBMISSION,
		payload: {
			id: reqId,
			workspaceId: workspace,
			submissionId: submission
		} as QuerySubmissionMessagePayload
	});
}
export function requestChangeSubmissionState(submission: string, workspace: string, newState: SubmissionState) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.CHANGE_SUBMISSION_STATE,
		payload: {
			workspaceId: workspace,
			submissionId: submission,
			newState
		} as ChangeSubmissionStateMessagePayload
	});
}
export function requestModifyTextIgnore(submission: string, workspace: string, newTextIgnore: Bounds[]) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.MODIFY_TEXT_IGNORE,
		payload: {
			workspaceId: workspace,
			submissionId: submission,
			newIgnoreText: newTextIgnore
		} as ChangeSubmissionTextIgnoreMessagePayload
	});
}
export function requestAddRegisterEntry(registerEntry: RegisterEntry, workspace: string) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.ADD_REGISTER_ENTRY,
		payload: {
			workspaceId: workspace,
			registerEntry
		} as AddRegisterMessagePayload
	});
}
export function requestEditRegisterEntry(registerEntry: RegisterEntry, workspace: string) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.EDIT_REGISTER_ENTRY,
		payload: {
			workspaceId: workspace,
			registerEntry
		} as ChangeRegisterMessagePayload
	});
}
export function requestDeleteRegisterEntry(registerEntry: string, workspace: string) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.DELETE_REGISTER_ENTRY,
		payload: {
			workspaceId: workspace,
			registerId: registerEntry
		} as DeleteRegisterMessagePayload
	});
}
export function requestMergeMistakes(mistakes: string[], workspace: string) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.MERGE_MISTAKES,
		payload: {
			workspaceId: workspace,
			hashes: mistakes
		} as MergeMistakesMessagePayload
	});
}
export function requestUnmergeMistakes(mistake: string, workspace: string) {
	if (!currentPort) return logger.error(`No port registered, cannot send message!`);
	currentPort?.postMessage({
		origin: name,
		type: MessageType.UNMERGE_MISTAKES,
		payload: {
			workspaceId: workspace,
			hash: mistake
		} as UnmergeMistakesMessagePayload
	});
}

// Sets the thread up to listen to ports.
function handlePortMessage(message: Message) {
	switch (message.type) {
		case MessageType.WORKSPACE_LIST:
			handleWorkspaceList(message.payload as WorkspaceListMessagePayload);
			break;
		case MessageType.WORKSPACE_DATA:
			handleWorkspaceData(message.payload as WorkspaceDataMessagePayload);
			break;
		case MessageType.SUBMISSION_DATA:
			handleSubmissionData(message.payload as SubmissionDataMessagePayload);
			break;
		case MessageType.SUBMISSION_STATE_CHANGED:
			handleSubmissionStateChanged(message.payload as SubmissionStateChangedMessagePayload);
			break;
		case MessageType.REGEN_SUBMISSIONS:
			handleRegenSubmissions(message.payload as RegenSubmissionsMessagePayload);
			break;
		case MessageType.REGISTER_UPDATED:
			handleRegisterUpdate(message.payload as RegisterUpdatedMessagePayload);
			break;
		default:
			logger.warn(`${message.origin} sent message of unknown type! Ignoring...`);
			break;
	}
}

function handleWorkspaceList(payload: WorkspaceListMessagePayload) {
	if (!(payload.id in awaitingRequests)) {
		logger.error(`Non-existant listener id returned by Divdabis!`);
		return;
	}
	awaitingRequests[payload.id].call(null, payload.workspaces);
}
function handleWorkspaceData(payload: WorkspaceDataMessagePayload) {
	if (!(payload.id in awaitingRequests)) {
		logger.error(`Non-existant listener id returned by Divdabis!`);
		return;
	}
	awaitingRequests[payload.id].call(null, payload.workspace);
}
function handleSubmissionData(payload: SubmissionDataMessagePayload) {
	if (!(payload.id in awaitingRequests)) {
		logger.error(`Non-existant listener id returned by Divdabis!`);
		return;
	}
	awaitingRequests[payload.id].call(null, payload.submission);
}
function handleSubmissionStateChanged(payload: SubmissionStateChangedMessagePayload) {
	const data: SubmissionStateChangeEventData = {
		id: payload.submissionId,
		workspace: payload.workspaceId,
		state: payload.newState
	}
	io.emit("submissionStateChange", data);
}
function handleRegenSubmissions(payload: RegenSubmissionsMessagePayload) {
	const data: SubmissionRegenEventData = {
		ids: payload.submissionsToRegen,
		workspace: payload.workspaceId
	}
	io.emit("submissionRegen", data);
}
function handleRegisterUpdate(payload: RegisterUpdatedMessagePayload) {
	const data: RegisterUpdateEventData = {
		data: payload.data,
		workspace: payload.workspaceId
	}
	io.emit("registerUpdate", data);
}

function handleChannelInit(payload: ChannelInitMessagePayload) {
	const messagingPort = payload.port;
	currentPort = messagingPort;
	messagingPort.on("message", (message: Message) => {
		handlePortMessage(message);
	});
	logger.log("Port successfully registered!");
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
})

// Express to listen for REST API requests.
const app = express();
app.use(cors());
app.use(workspaceRouter);

// Pass express to Socket.IO and start a Socket.IO to listen for Websocket Requests
const server = createServer(app);
export const io = new Server(server, {
	cors: {
		origin: config.frontendUrl
	}
});

const PORT = process.env.PORT || 3001;

io.on("connection", (socket) => {
	logger.log("An user has connected to the socket.");
	registerHandler(io, socket);
});

server.listen(PORT);
logger.info(`${name} is now listening on port ${PORT}!`);