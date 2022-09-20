import io, { Socket as SocketIO } from "socket.io-client";
import config from "$lib/config.json";
import type { RegisterEntry, RegisterUpdateEventData, Submission, SubmissionDataEventData, SubmissionID, SubmissionRegenEventData, SubmissionStateChangeEventData, UUID } from "@shared/api-types";
import type { Bounds, Mistake, MistakeHash } from "@shared/diff-engine";
import Diff from "@shared/diff-engine";
import { get } from "svelte/store";
import type { Stores } from "$lib/ts/stores";
import { APP_ONLINE } from "./networking";
import type WorkspaceCache from "../WorkspaceCache";

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

	private submissionDataPromise: {
		res: (data: Submission) => void,
		rej: (reason?: string) => void
	} | null = null;
	
	cache: WorkspaceCache | null = null;

	private workspace: Stores["workspace"];

	private activeSubmissionID: Stores["activeSubmissionID"];

	constructor(
		url: string,
		workspace: Stores["workspace"],
		activeSubmissionID: Stores["activeSubmissionID"]
	) {
		this.connectPromise = new Promise(async (res, rej) => {
			if (await APP_ONLINE) {
				this.socket = io(url);
				this.initSocketListening();
			}
		});

		this.workspace = workspace;
		this.activeSubmissionID = activeSubmissionID;

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

	private reloadActiveSubmission() {
		const id = get(this.activeSubmissionID);
		
		this.activeSubmissionID.set(null);
		this.activeSubmissionID.set(id);
	}

	requestSubmission(id: SubmissionID, workspaceId: UUID): Promise<Submission> {
		// TODO: Implement fetch from cache or fetch from server via Socket.io

		return new Promise<Submission>(async (res, rej) => {
			this.submissionDataPromise = { res, rej };

			// --- Temporary implementation for the debug dataset ---

			const ws = (await (get(this.workspace)))!;

			// Cast as Submission because for the debug workspace
			// data-wise, it's the Submission data
			const rawData = ws.submissions[id] as Submission;
			
			// rawData.data!.text = "Hedlw warld!";
			// get(workspace)!.template = "Hello world!";
		
			const text = parseIgnoreBounds(rawData.data!.text, rawData.data!.ignoreText);
			// const text = rawData.data!.text;
			const diff = new Diff(text, ws.template);
			diff.calc();

			this.onSubmissionData({
				id,
				workspace: workspaceId,
				state: "UNGRADED",
				data: {
					...rawData.data!,
					mistakes: await Promise.all(diff.getMistakes().map((m: Mistake) => m.exportData()))
				}
			});
		});
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

	async textIgnore(submission: SubmissionID, workspace: UUID, bounds: Bounds[]) {
		// TODO: Implement Socket event emit

		const ws = (await (get(this.workspace)))!;
		const rawData = ws.submissions[submission] as Submission;
		rawData.data!.ignoreText = bounds;

		this.onSubmissionRegen({ ids: [ submission ], workspace });
	}

	async submissionStateChange() {

	}

	private async onSubmissionData(data: SubmissionDataEventData) {
		if (this.submissionDataPromise === null) return;

		const submission: Submission = {
			id: data.id,
			state: data.state,
			data: data.data
		};

		this.cache?.updateSubmissionInCache(submission, data.workspace);
		this.submissionDataPromise.res(submission);
	}

	private onRegisterUpdate(data: RegisterUpdateEventData) {

	}

	private async onSubmissionRegen(data: SubmissionRegenEventData) {
		// Clears the submission from the cache

		await Promise.all(data.ids.map((id) => this.cache!.removeSubmissionFromCache(id, data.workspace)))

		const activeID = get(this.activeSubmissionID);

		// If the active submission was regenerated, trigger a reload
		if (activeID !== null && data.ids.includes(activeID)) {
			this.reloadActiveSubmission();
		}
	}

	private onSubmissionStateChange(data: SubmissionStateChangeEventData) {

	}
}
