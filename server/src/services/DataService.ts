// Divdabis - The #1 Diktify Database Management Service

import * as config from "../../config.json";
import mongoose from "mongoose";
import { parentPort, MessagePort } from "worker_threads";
import { Logger, LogLevel } from "yatsl";
import { ChannelInitMessagePayload, Message, MessageType, QueryWorkspaceListMessagePayload, QueryWorkspaceMessagePayload, WorkspaceDataMessagePayload, WorkspaceListMessagePayload } from "./types/MessageTypes";
import { getWorkspace, listWorkspaces } from "../controllers/DatabaseController";

const name = config.serviceNames.data;
export const logger = new Logger({
	minLevel: parseInt(process.env["LOGLEVEL"] as string) as LogLevel | undefined,
	name: name
});

if (!parentPort) {
	logger.error("This service cannot be run standalone. Please run index.ts.");
	process.exit();
}

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
	if (!currentPort) logger.error("No port registered, unable to process message!");
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
	if (!currentPort) logger.error("No port registered, unable to process message!");
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

