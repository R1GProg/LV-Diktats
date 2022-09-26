import { RegisterEntry } from "@shared/api-types";
import { Socket } from "socket.io";
import { io, logger } from "..";
import { deleteRegister, insertRegisterEntry, updateRegisterByID } from "../services/DatabaseManager";
import { tryParseJSON } from "../services/FormatManager";

// Handles events related to the Register.

export async function handleRegisterNewEvent(socket: Socket, id: string, workspace: string, data: RegisterEntry) {
	if (!data) {
		socket.emit("error", "Invalid RegisterEntry object!");
		return;
	}
	const register = await insertRegisterEntry(id, workspace, data);
	if (!register) socket.emit("error", "Register already exists and/or invalid Workspace ID!");
	else io.emit("registerUpdate", id, JSON.stringify(register), "ADD")
}

export async function handleRegisterEditEvent(socket: Socket, id: string, workspace: string, data: RegisterEntry) {
	if (!data) {
		socket.emit("error", "Invalid RegisterEntry object!");
		return;
	}
	const register = await updateRegisterByID(id, workspace, data);
	if (!register) socket.emit("error", "Register already exists and/or invalid Workspace ID!");
	else io.emit("registerUpdate", id, JSON.stringify(register), "EDIT")
}

export async function handleRegisterDeleteEvent(socket: Socket, id: string, workspace: string) {
	const register = await deleteRegister(id, workspace);
	if (!register) socket.emit("error", "Register doesn't exist and/or invalid Workspace ID!");
	else io.emit("registerUpdate", id, null, "DELETE")
}