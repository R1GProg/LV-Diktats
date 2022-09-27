import { RequestSubmissionEventData, SubmissionDataEventData, SubmissionRegenEventData, SubmissionState, SubmissionStateChangeEventData, TextIgnoreEventData } from "@shared/api-types";
import { Socket } from "socket.io";
import { fetchSubmissionByID, updateSubmissionIgnoreTextByID, updateSubmissionStateByID } from "../controllers/DatabaseController";
import { io } from "../services/NetworkingService";

// Handles events related to Submissions.

export async function handleRequestSubmissionEvent(socket: Socket, eventData: RequestSubmissionEventData) {
	const submission = await fetchSubmissionByID(eventData.id, eventData.workspace);
	if (!submission) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
	else {
		const response: SubmissionDataEventData = {
			id: submission.id,
			state: submission.state,
			data: submission.data,
			workspace: eventData.workspace
		}
		socket.emit("submissionData", response);
	}
}

export async function handleSubmissionStateChangeEvent(socket: Socket, eventData: SubmissionStateChangeEventData) {
	const result = await updateSubmissionStateByID(eventData.id, eventData.workspace, eventData.state);
	if (!result) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
	else {
		const response: SubmissionStateChangeEventData = {
			id: eventData.id,
			workspace: eventData.workspace,
			state: eventData.state
		}
		io.emit("submissionStateChange", response);
	}
}

export async function handleTextIgnoreEvent(socket: Socket, eventData: TextIgnoreEventData) {
	const result = await updateSubmissionIgnoreTextByID(eventData.id, eventData.workspace, eventData.ignoreBounds);
	if (!result) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
	else {
		const response: SubmissionRegenEventData = {
			ids: [eventData.id],
			workspace: eventData.workspace
		}
		io.emit("submissionRegen", response);
	}
}