import { MistakeMergeEventData, MistakeUnmergeEventData, SubmissionRegenEventData } from "@shared/api-types";
import { Socket } from "socket.io";
import { requestMergeMistakes, requestUnmergeMistakes } from "../services/NetworkingService";

// Handles events related to Mistakes.

export async function handleMistakeMergeEvent(socket: Socket, eventData: MistakeMergeEventData) {
	requestMergeMistakes(eventData.mistakes, eventData.workspace);
}

export async function handleMistakeUnmergeEvent(socket: Socket, eventData: MistakeUnmergeEventData) {
	requestUnmergeMistakes(eventData.mistake, eventData.workspace);
}