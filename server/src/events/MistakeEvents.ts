import { MistakeMergeEventData, MistakeUnmergeEventData, SubmissionRegenEventData } from "@shared/api-types";
import { Socket } from "socket.io";
import { io, logger } from "..";
import { mergeMistakesByHash, unmergeMistakesByHash } from "../services/DatabaseManager";

// Handles events related to Mistakes.

export async function handleMistakeMergeEvent(socket: Socket, eventData: MistakeMergeEventData) {
	const affectedSubmissions = await mergeMistakesByHash(eventData.mistakes, eventData.workspace);
	if (!affectedSubmissions) socket.emit("error", "Mistake hashes or workspace ID are invalid!");
	else {
		const response: SubmissionRegenEventData = {
			ids: affectedSubmissions,
			workspace: eventData.workspace
		}
		io.emit("submissionRegen", response);
	}
}

export async function handleMistakeUnmergeEvent(socket: Socket, eventData: MistakeUnmergeEventData) {
	const affectedSubmissions = await unmergeMistakesByHash(eventData.mistake, eventData.workspace);
	if (!affectedSubmissions) socket.emit("error", "Mistake hash or workspace ID are invalid!");
	else {
		const response: SubmissionRegenEventData = {
			ids: affectedSubmissions,
			workspace: eventData.workspace
		}
		io.emit("submissionRegen", response);
	}
}