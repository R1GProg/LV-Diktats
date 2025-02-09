import io, { Socket as SocketIO } from "socket.io-client";
import config from "$lib/config.json";
import type { MistakeMergeEventData, MistakeUnmergeEventData, RegisterDeleteEventData, RegisterEditEventData, RegisterEntry, RegisterEntryData, RegisterNewEventData, RegisterUpdateEventData, RegisterUpdateEventEntryData, RegisterUpdateEventType, RequestSubmissionEventData, Submission, SubmissionData, SubmissionDataEventData, SubmissionID, SubmissionRegenEventData, SubmissionState, SubmissionStateChangeEventData, TextIgnoreEventData, UUID } from "@shared/api-types";
import { Mistake, type Bounds, type MistakeData, type MistakeHash, type MistakeId } from "@shared/diff-engine";
import Diff from "@shared/diff-engine";
import { get } from "svelte/store";
import { reSort, type Stores } from "$lib/ts/stores";
import { APP_ONLINE } from "./networking";
import type WorkspaceCache from "../WorkspaceCache";
import { countRegisteredMistakes, deleteFirstMatching, getAllSubmissionsWithMistakes, getRegisterEntry, getSubmissionGradingStatus, submissionContainsMistake } from "../util";
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
	connectPromise: Promise<void>;

	private socket: SocketIO | null = null;

	private submissionDataPromise: {
		res: (data: Submission) => void,
		rej: (reason?: string) => void
	} | null = null;
	
	private submissionRegenPromise: {
		res: (data: SubmissionID[]) => void,
		rej: (reason?: string) => void
	} | null = null;

	cache: WorkspaceCache | null = null;

	private workspace: Stores["workspace"];

	private activeSubmissionID: Stores["activeSubmissionID"];

	private localWorkspaceDb: Stores["localWorkspaceDatabase"];

	private sort: Stores["sort"];

	private cbs: RegisterChangeCallback[] = [];

	constructor(
		url: string,
		workspace: Stores["workspace"],
		activeSubmissionID: Stores["activeSubmissionID"],
		localWorkspaceDb: Stores["localWorkspaceDatabase"],
		sort: Stores["sort"]
	) {
		this.connectPromise = new Promise(async (res) => {
			if (await APP_ONLINE) {
				this.socket = io(url);
				this.initSocketListening();
				res();
			}
		});

		this.workspace = workspace;
		this.activeSubmissionID = activeSubmissionID;
		this.localWorkspaceDb = localWorkspaceDb;
		this.sort = sort;

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

	async requestSubmission(id: SubmissionID, workspaceId: UUID): Promise<Submission> {
		if (config.debug) {
			const ws = (await (get(this.workspace)))!;

			// Cast as unknown as Submission because the debug workspace
			// includes the submission data
			const rawData = ws.submissions[id] as unknown as Submission;
			const mergedMistakes = rawData.data.mistakes.filter((m) => m.subtype === "MERGED");

			// Make sure the ignoreBounds are valid (Required on some platforms for some reason)
			for (const b of rawData.data.ignoreText) {
				if (b.start > b.end) {
					const correctStart = b.end;
					const correctEnd = b.start;

					b.start = correctStart;
					b.end = correctEnd;
				}
			}

			const diff = new Diff(parseIgnoreBounds(rawData.data.text, rawData.data.ignoreText), ws.template);
			diff.calc();
			
			// Remerges all previously merged mistakes, if they are still in the diff
			const rawMistakes = diff.getMistakes();
			const hashMistakeMap: Record<MistakeHash, Mistake> = {};
			const mistakeMapPromises: Promise<void>[] = [];
			
			// Pregenerate the hashes of all mistakes
			for (const m of rawMistakes) {
				mistakeMapPromises.push(new Promise<void>(async (res) => {
					hashMistakeMap[await m.genHash()] = m;
					res();
				}));
			}
			
			await Promise.all(mistakeMapPromises);
			const splitMerged: MistakeData[] = [];

			const mergeMistake = async (m: MistakeData) => {
				const mistakesToMerge = m.children.map((child) => hashMistakeMap[child.hash]) as (Mistake | undefined)[];

				if (mistakesToMerge.includes(undefined)) return false;

				const mergedMistake = Mistake.mergeMistakes(...mistakesToMerge as Mistake[]);
				
				// Remove the mistakes that were merged, add the new merged mistake
				for (const child of m.children) {
					delete hashMistakeMap[child.hash];
				}

				hashMistakeMap[await mergedMistake.genHash()] = mergedMistake;

				return true;
			}

			// Merge previously merged mistakes
			for (const m of mergedMistakes) {
				let stillMerged = true;
				let split = false;

				if (m.children.length < 2) continue;

				// Check if all of the mistakes are still in the diff
				for (const child of m.children) {
					if (!(child.hash in hashMistakeMap)) {
						stillMerged = false;

						if (child.splitFrom) {
							split = true;
						} else {
							split = false;
						}

						break;
					}
				}
				
				if (!stillMerged) {
					if (split) splitMerged.push(m);
					continue;
				}
				
				await mergeMistake(m);
			}

			let mistakes = await Promise.all(Object.values(hashMistakeMap).map((m) => m.exportData()));
			mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

			// Split mistakes
			for (const hash of (rawData.data.splitMistakes ?? [])) {
				const mIndex = mistakes.findIndex((cm) => cm.hash === hash);
				const m = mistakes[mIndex];
				
				if (!m) {
					rawData.data.splitMistakes.splice(rawData.data.splitMistakes.findIndex((v) => v === hash), 1);
					continue;
				}

				const split = Mistake.splitMixed(m);
				
				if (!split) {
					console.warn(`Failed to split mixed! (${hash})`);
					rawData.data.splitMistakes.splice(rawData.data.splitMistakes.findIndex((v) => v === hash), 1);
					continue;
				}

				// Add an offset to boundsDiff for all mistakes after this one
				const curMistakeLen = m.boundsDiff.end - m.boundsDiff.start;
				const newMistakeLen = split.add.word.length + split.del.word.length;
				const offset = newMistakeLen - curMistakeLen;

				for (let i = mIndex + 1; i < mistakes.length; i++) {
					const otherM = mistakes[i];
					otherM.boundsDiff.start += offset;
					otherM.boundsDiff.end += offset;

					if (otherM.subtype === "MERGED") {
						for (const c of otherM.children) {
							c.boundsDiff.start += offset;
							c.boundsDiff.end += offset;
						}
					}
				}

				const addData = await split.add.exportData();
				const delData = await split.del.exportData();

				mistakes.splice(mIndex, 1);
				mistakes.splice(mIndex, 0, addData);
				mistakes.splice(mIndex, 0, delData);

				delete hashMistakeMap[m.hash];
				hashMistakeMap[addData.hash] = split.add;
				hashMistakeMap[delData.hash] = split.del;
			}

			// Merge split mistakes
			for (const m of splitMerged) {
				if (!await mergeMistake(m)) {
					console.warn(`Failed to remerge mistake (${m.hash}, ${m.word})`);
				}
			}


			mistakes = await Promise.all(Object.values(hashMistakeMap).map((m) => m.exportData()));

			// HACK: if there are any mistakes that ended up with the same hash and got dropped,
			// reintroduce them back here
			if (rawMistakes.length !== mistakes.length) {
				const rawHashes = await Promise.all(rawMistakes.map((m) => m.genHash()));
				const rawHashMistakePairs = rawMistakes.map((m, i) => ({ hash: rawHashes[i], mistake: m }));
				const mistakesHashCollisions: Record<string, Mistake[]> = {};

				for (const pair of rawHashMistakePairs) {
					const hash = pair.hash;

					if (hash in mistakesHashCollisions) {
						mistakesHashCollisions[hash].push(pair.mistake);
					} else {
						mistakesHashCollisions[hash] = [pair.mistake];
					}
				}

				// for all that have a hash collision, re-add the one that is missing from the new mistakes array
				for (const hash of Object.keys(mistakesHashCollisions)) {
					if (mistakesHashCollisions[hash].length === 1) continue;

					const missingMistake = mistakesHashCollisions[hash].find((m) => !mistakes.find((cm) => cm.id === m.id));

					if (!missingMistake) continue;

					mistakes.push(await missingMistake.exportData());
					console.warn(`Reintroduced mistake with hash collision ("${missingMistake.word}", diff: [${missingMistake.boundsDiff.start}; ${missingMistake.boundsDiff.end}])`);
				}
			}

			mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

			const updatedData: SubmissionData = {
				...rawData.data,
				splitMistakes: rawData.data.splitMistakes ?? [],
				mistakes,
			};

			let state: SubmissionState = "UNGRADED";

			if (
				rawData.state === "REJECTED"
				|| rawData.data.text.length < ws.template.length * config.incompleteFraction
			) {
				state = "REJECTED";
			} else {
				const gradingStatus = getSubmissionGradingStatus({ data: updatedData } as Submission, ws);

				if (gradingStatus === 1) {
					state = "WIP";
				} else if (gradingStatus === 2) {
					state = "DONE";
				}
			}

			return this.setSubmissionDataPromise(() => {
				this.onSubmissionData({
					id,
					workspace: workspaceId,
					state,
					data: updatedData,
				});
			});
		} else if (this.socket) {
			const request: RequestSubmissionEventData = {
				id,
				workspace: workspaceId
			}

			this.socket.emit("requestSubmission", request);

			return this.setSubmissionDataPromise();
		}

		// The execution reaches here only if not debug and socket not found
		// TODO: Return null in this case
		return this.setSubmissionDataPromise();
	}
	
	async mistakeMerge(mistakes: MistakeHash[], workspace: UUID) {
		if (config.debug) {
			const subData = (await get(this.workspace)!).submissions as unknown as Record<SubmissionID, Submission>;
			const targetSubmissions = getAllSubmissionsWithMistakes(Object.values(subData), mistakes);

			const parsePromises: Promise<void>[] = [];

			for (const subId of targetSubmissions) {
				parsePromises.push(new Promise<void>(async (res) => {
					const subMistakes = subData[subId].data.mistakes;
					const targetSubMistakes = subMistakes
						.filter((m) => mistakes.includes(m.hash))
						.map((m) => Mistake.fromData(m));

					const mergedMistake = Mistake.mergeMistakes(...targetSubMistakes);

					for (const prevMistake of targetSubMistakes) {
						subMistakes.splice(subMistakes.findIndex((m) => m.id === prevMistake.id), 1);
					}

					subMistakes.push(await mergedMistake.exportData());
					subMistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

					res();
				}));
			}

			await Promise.all(parsePromises);

			return this.setRegenPromise(() => {
				this.onSubmissionRegen({ workspace, ids: targetSubmissions });
			});
		} else if (this.socket) {
			const request: MistakeMergeEventData = {
				mistakes,
				workspace
			}

			this.socket.emit("mistakeMerge", request);
			return this.setRegenPromise();
		}

		return null;
	}
	
	async mistakeUnmerge(targetMistake: MistakeHash, workspace: UUID) {
		if (config.debug) {
			const ws = await get(this.workspace)!;

			const subData = ws.submissions as unknown as Record<SubmissionID, Submission>;
			const targetSubmissions = Object.values(subData)
				.filter((s) => s.data.mistakes.map((m) => m.hash).includes(targetMistake));
			
			const parsePromises: Promise<void>[] = [];
			
			for (const sub of targetSubmissions) {
				parsePromises.push(new Promise<void>(async (res) => {
					const subMistakes = sub.data.mistakes;
					const targetSubMistake = subMistakes.findIndex((m) => m.hash === targetMistake)!;
					const unmergedMistakes = Mistake.unmergeMistake(Mistake.fromData(subMistakes[targetSubMistake]));
					
					subMistakes.splice(targetSubMistake, 1);
					
					subMistakes.push(...await Promise.all(unmergedMistakes.map((m) => m.exportData())));
					subMistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
					
					res();
				}));
			}
			
			await Promise.all(parsePromises);

			const mRegEntry = getRegisterEntry(targetMistake, ws.register);

			if (mRegEntry) {
				if (mRegEntry.mistakes.length === 1) {
					this.registerDelete({
						...mRegEntry,
						action: "DELETE"
					}, ws.id);
				} else {
					const regMistakes = [...mRegEntry.mistakes];
					regMistakes.splice(regMistakes.findIndex((m) => m === targetMistake), 1);
					
					await this.registerUpdate({
						...mRegEntry,
						mistakes: regMistakes,
						action: "EDIT",
					}, ws.id);
				}
			}

			this.setRegenPromise(() => {
				this.onSubmissionRegen({ workspace, ids: targetSubmissions.map((s) => s.id) });
			});
		} else if (this.socket) {
			const request: MistakeUnmergeEventData = {
				mistake: targetMistake,
				workspace
			}

			this.socket.emit("mistakeUnmerge", request);

			return this.setRegenPromise();
		}

		return null
	}

	async registerNew(data: RegisterEntryData, workspace: UUID) {
		if (config.debug) {
			const ws = await get(this.workspace);
			if (ws === null) return;

			let count = 0;
			const _mistakeWords: Record<MistakeHash, string> = {};

			for (const m of data.mistakes!) {
				const submArr = getAllSubmissionsWithMistakes(Object.values(ws.submissions) as unknown as Submission[], [ m ]);
				count += submArr.length;

				// Safe to do it like this because there must be at least one submission (The active one)
				_mistakeWords[m] = (ws.submissions[submArr[0]] as unknown as Submission)?.data.mistakes.find((sm) => sm.hash === m)!.word;
			}

			const serverData: RegisterEntry = {
				id: uuidv4(),
				mistakes: data.mistakes!,
				description: data.description!,
				opts: data.opts!,
				count,
				_mistakeWords,
			};

			this.onRegisterUpdate({ data: [{ type: "ADD", entry: serverData }], workspace });
		} else {
			if (this.socket) {
				const payloadData: RegisterEntry = {
					id: uuidv4(),
					mistakes: data.mistakes!,
					description: data.description!,
					opts: data.opts!,
					count: 0, // The Server will do the counting
				}
				const request: RegisterNewEventData = {
					data: payloadData,
					workspace
				}
				this.socket.emit("registerNew", request);
			}
		}
	}

	async registerUpdate(data: RegisterEntryData, workspace: UUID) {
		if (config.debug) {
			const ws = await get(this.workspace);
			if (ws === null) return;

			let count = 0;
			const _mistakeWords: Record<MistakeHash, string> = {};
			const emptyMistakes: MistakeHash[] = [];

			for (const m of data.mistakes!) {
				const submArr = getAllSubmissionsWithMistakes(Object.values(ws.submissions) as unknown as Submission[], [ m ]);
				count += submArr.length;

				if (submArr.length === 0) {
					// If the mistake was unmerged or unsplit
					emptyMistakes.push(m);
					continue;
				}

				// Safe to do it like this because there must be at least one submission (The active one)
				_mistakeWords[m] = (ws.submissions[submArr[0]] as unknown as Submission)?.data.mistakes.find((sm) => sm.hash === m)!.word;
			}

			for (const m of emptyMistakes) {
				data.mistakes!.splice(data.mistakes!.findIndex((cm) => cm === m), 1);
			}

			const serverData: RegisterEntry = {
				id: data.id!,
				mistakes: data.mistakes!,
				description: data.description!,
				opts: data.opts!,
				count,
				_mistakeWords
			};
			
			this.onRegisterUpdate({ data: [{ type: "EDIT", entry: serverData }], workspace });
		} else {
			if (this.socket) {
				const payloadData: RegisterEntry = {
					id: data.id!,
					mistakes: data.mistakes!,
					description: data.description!,
					opts: data.opts!,
					count: 0, // The Server will do the counting
				}
				const request: RegisterEditEventData = {
					id: data.id!,
					data: payloadData,
					workspace
				}
				this.socket.emit("registerEdit", request);
			}
		}
	}

	async registerDelete(data: RegisterEntryData, workspace: UUID) {
		if (config.debug) {
			const serverData: RegisterEntry = {
				id: data.id!,
				mistakes: data.mistakes!,
				description: data.description!,
				opts: data.opts!,
				count: 0,
			};
	
			this.onRegisterUpdate({ data: [{ type: "DELETE", entry: serverData }], workspace });
		} else {
			if (this.socket) {
				const request: RegisterDeleteEventData = {
					id: data.id!,
					workspace
				}

				this.socket.emit("registerDelete", request);
			}
		}
	}

	async textIgnore(submission: SubmissionID, workspace: UUID, bounds: Bounds[]) {
		if (config.debug) {
			const ws = (await (get(this.workspace)))!;
			const rawData = ws.submissions[submission] as unknown as Submission;
			rawData.data!.ignoreText = bounds;

			return this.setRegenPromise(() => {
				this.onSubmissionRegen({ ids: [ submission ], workspace });
			});
		} else if (this.socket) {
			const request: TextIgnoreEventData = {
				id: submission,
				ignoreBounds: bounds,
				workspace
			}

			this.socket.emit("ignoreText", request);
			return this.setRegenPromise();
		}

		return null;
	}

	async submissionStateChange(newState: SubmissionState, subId: SubmissionID, workspace: UUID) {
		if (config.debug) {
			const ws = (await (get(this.workspace)))!;
			const rawData = ws.submissions[subId] as unknown as Submission;
			rawData.state = newState;

			this.onSubmissionStateChange({
				state: newState,
				id: subId,
				workspace,
			});
		} else {
			// TODO: SERVER IMPLEMENTATION
			if (this.socket) {
				const request: SubmissionStateChangeEventData = {
					id: subId,
					state: newState,
					workspace
				}
				this.socket.emit("submissionStateChange", request);
			}
		}
	}

	async splitMixedMistake(id: MistakeId, submission: SubmissionID, workspace: UUID) {
		if (config.debug) {
			const ws = await get(this.workspace)!;
			const subData = ws.submissions as unknown as Record<SubmissionID, Submission>;
			const m = subData[submission].data.mistakes.find((cm) => cm.id === id);

			if (!m) return null;

			subData[submission].data.splitMistakes.push(m.hash);

			const mRegEntry = getRegisterEntry(m.hash, ws.register);

			if (mRegEntry) {
				if (mRegEntry.mistakes.length === 1) {
					this.registerDelete({
						...mRegEntry,
						action: "DELETE"
					}, ws.id);
				} else {
					const regMistakes = [...mRegEntry.mistakes];
					regMistakes.splice(regMistakes.findIndex((cm) => cm === m.hash), 1);
					
					await this.registerUpdate({
						...mRegEntry,
						mistakes: regMistakes,
						action: "EDIT",
					}, ws.id);
				}
			}

			return this.setRegenPromise(() => {
				this.onSubmissionRegen({ workspace, ids: [ submission ] });
			});
		} else if (this.socket) {
			// const request: MistakeMergeEventData = {
			// 	mistakes,
			// 	workspace
			// }

			// this.socket.emit("mistakeMerge", request);
			// return this.setRegenPromise();
			throw "NYI";
		}

		return null;
	}

	async unsplitMixedMistake(hash: MistakeHash, submission: SubmissionID, workspace: UUID) {
		if (config.debug) {
			const ws = await get(this.workspace)!;
			const subData = ws.submissions as unknown as Record<SubmissionID, Submission>;

			deleteFirstMatching(subData[submission].data.splitMistakes, (h) => h === hash);

			return this.setRegenPromise(() => {
				this.onSubmissionRegen({ workspace, ids: [ submission ] });
			});
		} else if (this.socket) {
			// const request: MistakeMergeEventData = {
			// 	mistakes,
			// 	workspace
			// }

			// this.socket.emit("mistakeMerge", request);
			// return this.setRegenPromise();
			throw "NYI";
		}

		return null;
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

		if (ws !== null && ws.local) {
			ws.submissions[data.id] = { ...submission, mistakeCount: submission.data.mistakes.length };
			(await get(this.localWorkspaceDb)).updateActive();
		}

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

			// Update the state of other submissions
			for (const sub of Object.values(ws.submissions) as unknown as Submission[]) {
				const mCount = sub.data.mistakes.length;
				const regMistakes = countRegisteredMistakes(sub, ws.register);

				if (mCount === regMistakes && sub.state !== "DONE") {
					this.submissionStateChange("DONE", sub.id, ws.id);
				}
			}
			
			this.execRegisterChangeCallbacks(data.data);

			if (curSub === null) continue;

			let reloadCurrent = false;

			for (const m of entry.entry.mistakes) {
				if (submissionContainsMistake(curSub, m)) {
					reloadCurrent = true;
					break;
				}
			}

			if (reloadCurrent) {
				const gradingStatus = getSubmissionGradingStatus(curSub, ws);

				if (gradingStatus === 2) {
					console.log("set done");
					this.submissionStateChange("DONE", curSub.id, ws.id);
				} else if (curSub.state === "DONE") {
					console.log("set wip");
					this.submissionStateChange("WIP", curSub.id, ws.id);
				}
				
				this.reloadActiveSubmission();
			}
		}

		if (ws.local) {
			(await get(this.localWorkspaceDb)).updateActive();
		}
	}

	private async onSubmissionRegen(data: SubmissionRegenEventData) {
		// Clears the submissions from the cache
		await this.cache!.removeSubmissionsFromCache(data.ids, data.workspace);

		const activeID = get(this.activeSubmissionID);
		reSort((await get(this.workspace))!, get(this.sort));

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
	
		const activeID = get(this.activeSubmissionID);
		if (data.id === activeID) this.reloadActiveSubmission(); // kinda stupid
		reSort(ws, get(this.sort));

		if (ws.local) {
			(await get(this.localWorkspaceDb)).updateActive();
		}
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
