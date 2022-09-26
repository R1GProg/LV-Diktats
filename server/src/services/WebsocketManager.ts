import { Server, Socket } from "socket.io";
import { test } from "../events/DebugEvents";
import { handleMistakeMergeEvent, handleMistakeUnmergeEvent } from "../events/MistakeEvents";
import { handleRegisterDeleteEvent, handleRegisterEditEvent, handleRegisterNewEvent } from "../events/RegisterEvents";
import { handleRequestSubmissionEvent, handleSubmissionStateChangeEvent, handleTextIgnoreEvent } from "../events/SubmissionEvents";

// Manages Websocket Events and Requests

// A map of events and their handler functions
const handlerMap: Record<string, { (...args: any[]): void; }> = {
	// "test": test,
	"requestSubmission": handleRequestSubmissionEvent,
	"registerNew": handleRegisterNewEvent,
	"registerEdit": handleRegisterEditEvent,
	"registerDelete": handleRegisterDeleteEvent,
	"submissionStateChange": handleSubmissionStateChangeEvent,
	"ignoreText": handleTextIgnoreEvent,
	"mistakeMerge": handleMistakeMergeEvent,
	"mistakeUnmerge": handleMistakeUnmergeEvent
}

export function registerHandler(io: Server, socket: Socket) {
	for (const event in handlerMap) {
		socket.on(event, async (...args: any[]) => {
			const _ = handlerMap[event](socket, ...args);
			return;
		});
	}
}