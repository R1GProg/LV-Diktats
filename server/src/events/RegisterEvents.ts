import { RegisterDeleteEventData, RegisterEditEventData, RegisterEntry, RegisterNewEventData, RegisterUpdateEventData } from "@shared/api-types";
import { Socket } from "socket.io";
import { requestAddRegisterEntry, requestDeleteRegisterEntry, requestEditRegisterEntry } from "../services/NetworkingService";

// Handles events related to the Register.

export async function handleRegisterNewEvent(socket: Socket, eventData: RegisterNewEventData) {
	if (!eventData.data) {
		socket.emit("error", "Invalid RegisterEntry object!");
		return;
	}
	requestAddRegisterEntry(eventData.data, eventData.workspace);
}

export async function handleRegisterEditEvent(socket: Socket, eventData: RegisterEditEventData) {
	if (!eventData.data) {
		socket.emit("error", "Invalid RegisterEntry object!");
		return;
	}
	requestEditRegisterEntry(eventData.data, eventData.workspace);
}

export async function handleRegisterDeleteEvent(socket: Socket, eventData: RegisterDeleteEventData) {
	requestDeleteRegisterEntry(eventData.id, eventData.workspace);
}