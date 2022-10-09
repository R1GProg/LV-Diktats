import io, { Socket as SocketIO } from "socket.io-client";
import config from "$lib/config.json";
import type { MistakeMergeEventData, MistakeUnmergeEventData, RegisterDeleteEventData, RegisterEditEventData, RegisterEntry, RegisterEntryData, RegisterNewEventData, RegisterUpdateEventData, RegisterUpdateEventEntryData, RegisterUpdateEventType, RequestSubmissionEventData, Submission, SubmissionDataEventData, SubmissionID, SubmissionRegenEventData, SubmissionState, SubmissionStateChangeEventData, TextIgnoreEventData, UUID } from "@shared/api-types";
import { Mistake, type Bounds, type MistakeHash } from "@shared/diff-engine";
import Diff from "@shared/diff-engine";
import { get } from "svelte/store";
import type { Stores } from "$lib/ts/stores";
import { APP_ONLINE } from "./networking";
import type WorkspaceCacheDatabase from "$lib/ts/database/WorkspaceCacheDatabase";
import { getAllSubmissionsWithMistakes, submissionContainsMistake } from "../util";
import { v4 as uuidv4 } from "uuid";

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

export type RegisterChangeCallback = (data: { type: RegisterUpdateEventType, entry: RegisterEntry }[]) => void;

export default class DiktifySocket {
	private connectPromise: Promise<void>;

	private socket: SocketIO | null = null;

	private submissionDataPromise: {
		res: (data: Submission) => void,
		rej: (reason?: string) => void
	} | null = null;
	
	private submissionRegenPromise: {
		res: (data: SubmissionID[]) => void,
		rej: (reason?: string) => void
	} | null = null;

	cache: WorkspaceCacheDatabase | null = null;

	private workspace: Stores["workspace"];

	private activeSubmissionID: Stores["activeSubmissionID"];

	private cbs: RegisterChangeCallback[] = [];

	constructor(
		url: string,
		workspace: Stores["workspace"],
		activeSubmissionID: Stores["activeSubmissionID"],
	) {
		this.connectPromise = new Promise(async (res, rej) => {
			if (await APP_ONLINE) {
				this.socket = io(url);
				this.initSocketListening();
			}

			res();
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

	init() {
		return this.connectPromise;
	}

	private reloadActiveSubmission() {
		const id = get(this.activeSubmissionID);

		this.activeSubmissionID.set(null);
		this.activeSubmissionID.set(id);
	}

	async requestSubmission(id: SubmissionID, workspaceId: UUID): Promise<Submission | null> {
		if (this.socket === null) {
			return this.setSubmissionDataPromise();
		}

		const request: RequestSubmissionEventData = {
			id,
			workspace: workspaceId
		}

		this.socket.emit("requestSubmission", request);

		return this.setSubmissionDataPromise();
	}
	
	async mistakeMerge(mistakes: MistakeHash[], workspace: UUID) {
		if (this.socket === null) {
			return null;
		}

		const request: MistakeMergeEventData = {
			mistakes,
			workspace
		}

		this.socket.emit("mistakeMerge", request);
		return this.setRegenPromise();
	}
	
	async mistakeUnmerge(targetMistake: MistakeHash, workspace: UUID) {
		if (this.socket === null) return null;

		const request: MistakeUnmergeEventData = {
			mistake: targetMistake,
			workspace
		}

		this.socket.emit("mistakeUnmerge", request);

		return this.setRegenPromise();
	}

	async registerNew(data: RegisterEntryData, workspace: UUID): Promise<boolean> {
		if (this.socket === null) return false;

		const payloadData: RegisterEntry = {
			id: uuidv4(),
			mistakes: data.mistakes!,
			description: data.description!,
			ignore: data.ignore!,
			count: 0, // The Server will do the counting
		}

		const request: RegisterNewEventData = {
			data: payloadData,
			workspace
		}

		this.socket.emit("registerNew", request);
		return true;
	}

	async registerUpdate(data: RegisterEntryData, workspace: UUID): Promise<boolean> {
		if (this.socket === null) return false;

		const payloadData: RegisterEntry = {
			id: data.id!,
			mistakes: data.mistakes!,
			description: data.description!,
			ignore: data.ignore!,
			count: 0, // The Server will do the counting
		}
		
		const request: RegisterEditEventData = {
			id: data.id!,
			data: payloadData,
			workspace
		}

		this.socket.emit("registerEdit", request);
		return true;
	}

	async registerDelete(data: RegisterEntryData, workspace: UUID): Promise<boolean> {
		if (this.socket === null) return false;

		const request: RegisterDeleteEventData = {
			id: data.id!,
			workspace
		}

		this.socket.emit("registerDelete", request);
		return true;
	}

	async textIgnore(submission: SubmissionID, workspace: UUID, bounds: Bounds[]) {
		if (this.socket === null) return null;

		const request: TextIgnoreEventData = {
			id: submission,
			ignoreBounds: bounds,
			workspace
		}

		this.socket.emit("ignoreText", request);
		return this.setRegenPromise();
	}

	async submissionStateChange(newState: SubmissionState, subId: SubmissionID, workspace: UUID) {
		if (this.socket === null) return false;

		const request: SubmissionStateChangeEventData = {
			id: subId,
			state: newState,
			workspace
		}

		this.socket.emit("submissionStateChange", request);
		return true;
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

		const ws = await get(this.workspace);

		// if (ws !== null && ws.local) {
		// 	ws.submissions[data.id] = { ...submission, mistakeCount: submission.data.mistakes.length };
		// 	(await get(this.localWorkspaceDb)).updateActive();
		// }

		if (this.submissionRegenPromise !== null) {
			this.submissionRegenPromise.res([ data.id ]);
		}
	}

	private async onRegisterUpdate(data: RegisterUpdateEventData) {
		const ws = await get(this.workspace);

		if (ws === null) return;

		for (const entry of data.data) {
			switch(entry.type) {
				case "ADD":
					ws.register.push(entry.entry);
					break;
				case "EDIT":
					{
						const targetIndex = ws.register.findIndex((e) => e.id === entry.entry.id);

						if (targetIndex === -1) {
							console.warn(`Attempt to update a register entry that doesn't exist! (${entry.entry.id})`);
							break;
						}

						ws.register[targetIndex] = entry.entry;
					}

					break;
				case "DELETE":
					{
						const targetIndex = ws.register.findIndex((e) => e.id === entry.entry.id);

						if (targetIndex === -1) {
							console.warn(`Attempt to delete a register entry that doesn't exist! (${entry.entry.id})`);
							break;
						}

						ws.register.splice(targetIndex, 1);
					}
					
					break;
			}

			const activeID = get(this.activeSubmissionID);
			const curSub = activeID ? ws.submissions[activeID] as unknown as Submission : null;

			this.execRegisterChangeCallbacks(data.data);

			if (curSub === null) continue;

			let reloadCurrent = false;

			for (const m of entry.entry.mistakes) {
				if (submissionContainsMistake(curSub, m)) {
					reloadCurrent = true;
					break;
				}
			}

			if (reloadCurrent) this.reloadActiveSubmission();
		}

		// if (ws.local) {
		// 	(await get(this.localWorkspaceDb)).updateActive();
		// }
	}

	private async onSubmissionRegen(data: SubmissionRegenEventData) {
		// Clears the submissions from the cache
		await this.cache!.removeSubmissionsFromCache(data.ids, data.workspace);

		const activeID = get(this.activeSubmissionID);

		// If the active submission was regenerated, trigger a reload
		if (activeID !== null && data.ids.includes(activeID)) {
			this.reloadActiveSubmission();
		}
	}

	private async onSubmissionStateChange(data: SubmissionStateChangeEventData) {
		const ws = await get(this.workspace);
		if (ws === null) return;

		ws.submissions[data.id].state = data.state;

		if (!this.cache || !(await this.cache.isSubmissionCached(data.id, data.workspace))) return;

		// Retrieve submission from cache, update the state, rewrite it to the cache
		const existingData = (await this.cache.getSubmission(data.id, data.workspace))!;
		existingData.state = data.state;
		await this.cache.updateSubmissionInCache(existingData, data.workspace);
	
		// if (ws.local) {
		// 	(await get(this.localWorkspaceDb)).updateActive();
		// }
	}

	addRegisterChangeCallback(cb: RegisterChangeCallback) {
		this.cbs.push(cb);
	}

	private execRegisterChangeCallbacks(newData: RegisterUpdateEventEntryData[]) {
		for (const cb of this.cbs) { cb(newData); }
	}

	private setRegenPromise(cb?: () => void) {
		return new Promise<SubmissionID[]>((res, rej) => {
			this.submissionRegenPromise = { res, rej };
			if (cb) cb();
		});
	}

	private setSubmissionDataPromise(cb?: () => void) {
		return new Promise<Submission>(async (res, rej) => {
			this.submissionDataPromise = { res, rej };
			if (cb) cb();
		});
	}
}
