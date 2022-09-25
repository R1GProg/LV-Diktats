import { Socket } from "socket.io";
import { io, logger } from "..";
import { mergeMistakesByHash, unmergeMistakesByHash } from "../services/DatabaseManager";

// Handles events related to Mistakes.

export async function handleMistakeMergeEvent(socket: Socket, mistakes: string[], workspace: string) {
	const affectedSubmissions = await mergeMistakesByHash(mistakes, workspace);
	if (!affectedSubmissions) socket.emit("error", "Mistake hashes or workspace ID are invalid!");
	else io.emit("submissionRegen", affectedSubmissions)
}

export async function handleMistakeUnmergeEvent(socket: Socket, mistakes: string, workspace: string) {
	const affectedSubmissions = await unmergeMistakesByHash(mistakes, workspace);
	if (!affectedSubmissions) socket.emit("error", "Mistake hash or workspace ID are invalid!");
	else io.emit("submissionRegen", affectedSubmissions)
}