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
import { ChannelInitMessagePayload, Message, MessageType, QueryWorkspaceListMessagePayload, QueryWorkspaceMessagePayload, WorkspaceDataMessagePayload, WorkspaceListMessagePayload } from "./types/MessageTypes";
import { UUID, Workspace } from "@shared/api-types";
import { v4 as uuidv4 } from "uuid";

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
	if (!currentPort) logger.error(`No port registered, cannot send message!`);
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
	if (!currentPort) logger.error(`No port registered, cannot send message!`);
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

// Sets the thread up to listen to ports.
function handlePortMessage(message: Message) {
	switch (message.type) {
		case MessageType.WORKSPACE_LIST:
			handleWorkspaceList(message.payload as WorkspaceListMessagePayload);
			break;
		case MessageType.WORKSPACE_DATA:
			handleWorkspaceData(message.payload as WorkspaceDataMessagePayload);
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