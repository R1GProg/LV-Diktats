import { RequestSubmissionEventData, SubmissionDataEventData, SubmissionRegenEventData, SubmissionState, SubmissionStateChangeEventData, TextIgnoreEventData } from "@shared/api-types";
import { Socket } from "socket.io";
import { fetchSubmissionByID, updateSubmissionIgnoreTextByID, updateSubmissionStateByID } from "../controllers/DatabaseController";
import { io, requestChangeSubmissionState, requestModifyTextIgnore, requestSubmissionData } from "../services/NetworkingService";

// Handles events related to Submissions.

export async function handleRequestSubmissionEvent(socket: Socket, eventData: RequestSubmissionEventData) {
	requestSubmissionData(eventData.id, eventData.workspace, (submission) => {
		if (!submission) socket.emit("error", "Invalid Submission ID and/or Workspace ID!");
		const response: SubmissionDataEventData = {
			id: submission.id,
			state: submission.state,
			data: submission.data,
			workspace: eventData.workspace
		}
		socket.emit("submissionData", response);
	})
}

export async function handleSubmissionStateChangeEvent(socket: Socket, eventData: SubmissionStateChangeEventData) {
	requestChangeSubmissionState(eventData.id, eventData.workspace, eventData.state);
}

export async function handleTextIgnoreEvent(socket: Socket, eventData: TextIgnoreEventData) {
	requestModifyTextIgnore(eventData.id, eventData.workspace, eventData.ignoreBounds);
}