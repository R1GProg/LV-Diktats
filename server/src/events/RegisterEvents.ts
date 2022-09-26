import { RegisterDeleteEventData, RegisterEditEventData, RegisterEntry, RegisterNewEventData, RegisterUpdateEventData } from "@shared/api-types";
import { Socket } from "socket.io";
import { io, logger } from "..";
import { deleteRegister, insertRegisterEntry, updateRegisterByID } from "../services/DatabaseManager";
import { tryParseJSON } from "../services/FormatManager";

// Handles events related to the Register.

export async function handleRegisterNewEvent(socket: Socket, eventData: RegisterNewEventData) {
	if (!eventData.data) {
		socket.emit("error", "Invalid RegisterEntry object!");
		return;
	}
	const register = await insertRegisterEntry(eventData.data, eventData.workspace);
	if (!register) socket.emit("error", "Register already exists and/or invalid Workspace ID!");
	else {
		const response: RegisterUpdateEventData = {
			data: [
				{
					entry: register,
					type: "ADD"
				}
			],
			workspace: eventData.workspace
		}
		io.emit("registerUpdate", response);
	}
}

export async function handleRegisterEditEvent(socket: Socket, eventData: RegisterEditEventData) {
	if (!eventData.data) {
		socket.emit("error", "Invalid RegisterEntry object!");
		return;
	}
	const register = await updateRegisterByID(eventData.data, eventData.workspace);
	if (!register) socket.emit("error", "Register already exists and/or invalid Workspace ID!");
	else {
		const response: RegisterUpdateEventData = {
			data: [
				{
					entry: register,
					type: "EDIT"
				}
			],
			workspace: eventData.workspace
		}
		io.emit("registerUpdate", response);
	}
}

export async function handleRegisterDeleteEvent(socket: Socket, eventData: RegisterDeleteEventData) {
	const register = await deleteRegister(eventData.id, eventData.workspace);
	if (!register) socket.emit("error", "Register doesn't exist and/or invalid Workspace ID!");
	else {
		const response: RegisterUpdateEventData = {
			data: [
				{
					entry: register,
					type: "DELETE"
				}
			],
			workspace: eventData.workspace
		}
		io.emit("registerUpdate", response);
	}
}