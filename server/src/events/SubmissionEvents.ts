import { SubmissionState } from "@shared/api-types";
import { Bounds } from "@shared/diff-engine";
import { Socket } from "socket.io";
import { io } from "..";
import { fetchSubmissionByID, updateSubmissionIgnoreTextByID, updateSubmissionStateByID } from "../services/DatabaseManager";

// Handles events related to Submissions.

export async function handleRequestSubmissionEvent(socket: Socket, id: string, workspace: string) {
	const submission = await fetchSubmissionByID(id, workspace);
	if (!submission) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
	else socket.emit("submissionData", JSON.stringify(submission.data));
}

export async function handleSubmissionStateChangeEvent(socket: Socket, id: string, workspace: string, state: string) {
	const trueState: SubmissionState = state as SubmissionState;
	if (!trueState) {
		socket.emit("error", "Invalid Submission state!");
		return;
	}
	const result = await updateSubmissionStateByID(id, workspace, trueState);
	if (!result) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
	else io.emit("submissionStateChange", id, state);
}

export async function handleTextIgnoreEvent(socket: Socket, id: string, workspace: string, ignoreBounds: Bounds[]) {
	if (!ignoreBounds) {
		socket.emit("error", "Invalid bounds data!");
		return;
	}
	const result = await updateSubmissionIgnoreTextByID(id, workspace, ignoreBounds);
	if (!result) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
	else io.emit("submissionRegen", [id]);
}