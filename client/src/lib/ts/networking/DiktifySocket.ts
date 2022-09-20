import io, { Socket as SocketIO } from "socket.io-client";
import config from "$lib/config.json";
import type { RegisterEntry, RegisterUpdateEventData, Submission, SubmissionData, SubmissionDataEventData, SubmissionID, SubmissionRegenEventData, SubmissionStateChangeEventData, UUID } from "@shared/api-types";
import type { Bounds, Mistake, MistakeHash } from "@shared/diff-engine";
import Diff from "@shared/diff-engine";
import { get } from "svelte/store";
import { workspace } from "$lib/ts/stores";
import { APP_ONLINE } from "./networking";

// Here temporarily
function parseIgnoreBounds(rawText: string, ignoreBounds: Bounds[]) {
	let text = rawText;
	let offset = 0;

	for (const bounds of ignoreBounds) {
		const sub1 = text.substring(0, bounds.start - offset);
		const sub2 = text.substring(bounds.end - offset);
		text = (sub1 + sub2).trim();

		offset += bounds.end - bounds.start;
	}

	return text;
}

export default class DiktifySocket {
	connectPromise: Promise<void>;

	private socket: SocketIO | null = null;
	
	constructor(url: string) {
		this.connectPromise = new Promise(async (res, rej) => {
			if (await APP_ONLINE) {
				this.socket = io(url);
				this.initSocketListening();
			}
		});

		// TODO: Maybe have some sort of subscribe-to-workspace feature
		// so the server would know which clients specifically should receive
		// the updated data
	}

	private initSocketListening() {
		if (this.socket === null) {
			console.warn("Attempt to initialize socket listeners on an uninitialized socket!");
			return;
		}

		this.socket.on("submissionData", (data) => { this.onSubmissionData(data); });
		this.socket.on("registerUpdate", (data) => { this.onRegisterUpdate(data); });
		this.socket.on("submissionRegen", (data) => { this.onSubmissionRegen(data); });
		this.socket.on("submissionStateChange", (data) => { this.onSubmissionStateChange(data); });
	}

	async requestSubmission(id: SubmissionID, workspaceId: UUID): Promise<Submission> {
		// TODO: Implement fetch from cache or fetch from server via Socket.io

		const ws = (await get(workspace))!;
		const rawData = ws.submissions[id];
		
		// rawData.data!.text = "Hedlw warld!";
		// get(workspace)!.template = "Hello world!";
	
		const text = parseIgnoreBounds(rawData.data!.text, rawData.data!.ignoreText);
		// const text = rawData.data!.text;
		const diff = new Diff(text, ws.template);
		diff.calc();
		rawData.data!.mistakes = await Promise.all(diff.getMistakes().map((m: Mistake) => m.exportData()));
	
		return rawData;
	}
	
	async mistakeMerge(mistakes: MistakeHash[]) {
		
	}
	
	async mistakeUnmerge(mistakes: MistakeHash) {
		
	}

	async registerNew(data: RegisterEntry) {

	}

	async registerDelete(id: UUID) {

	}

	async registerEdit(id: UUID, data: RegisterEntry) {

	}

	async textIgnore(bounds: Bounds[]) {

	}

	async submissionStateChange() {

		
	}

	private onSubmissionData(data: SubmissionDataEventData) {

	}

	private onRegisterUpdate(data: RegisterUpdateEventData) {

	}

	private onSubmissionRegen(data: SubmissionRegenEventData) {

	}

	private onSubmissionStateChange(data: SubmissionStateChangeEventData) {

	}
}

export const ds = new DiktifySocket(config.socketUrl);