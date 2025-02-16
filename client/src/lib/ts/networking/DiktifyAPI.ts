import config from "$lib/config.json";
import type { RegisterEntry, Setting, Submission, SubmissionID, User, UUID, Workspace, WorkspacePreview } from "@shared/api-types";
import Diff, { Mistake, type Bounds, type MistakeData, type MistakeHash } from "@shared/diff-engine";
import { processString } from "@shared/normalization";
import { get } from "svelte/store";
import type { Stores } from "../stores";
import { countRegisteredMistakes, mistakeInRegister, submissionContainsMistake } from "../util";

type HTTPMethod = "GET" | "POST" | "PUT" | "HEAD" | "DELETE";

interface RequestOptions {
	method: HTTPMethod,
	body?: any,
	params?: Record<string, string>,
	output: "json" | "text"
}

interface RequestResult {
	data: Record<string, any> | string | null,
	status: number,
	error?: string,
}

export default class DiktifyAPI {
	constructor() {
		// TODO: Is it actually necessary to have this as a class?
	}

	private async fetch(path: string, opts: RequestOptions): Promise<RequestResult> {
		let bodyData: string;
		const headers: Record<string, string> = {};

		if (typeof opts.body === "object" && !(opts.body instanceof FormData)) {
			bodyData = JSON.stringify(opts.body);
			headers["Content-type"] = "application/json";
		} else {
			bodyData = opts.body;
		}

		const paramObj = opts.params ?? {};
		const params = new URLSearchParams(paramObj);
		const URL = `${config.endpointUrl}${path.startsWith("/") ? path : `/${path}`}`;
		let req: Response | null = null;

		try {
			req = await fetch(`${URL}${Object.keys(paramObj).length === 0 ? "" : `?${params.toString()}`}`, {
				method: opts.method,
				body: bodyData,
				headers,
			});

			if (req.status !== 200) {
				return {
					status: req.status,
					data: null,
					error: req.statusText
				}
			}
	
			return {
				status: req.status,
				data: opts.output === "json" ? await req.json() : await req.text(),
			};
		} catch (err: any) {
			return {
				status: 0,
				data: null,
				error: err.toString()
			}
		}
	}

	async getWorkspaces(): Promise<WorkspacePreview[]> {
		if (config.debug) {
			return [{ id: config.debugWorkspaceId, name: "Izdomāt diktātu (DEBUG)" }];
		}
		
		// TODO: SERVER FETCH
		const request = await fetch(`${config.endpointUrl}/api/workspaces`);
		const response: WorkspacePreview[] = await request.json();
		return response;
	}

	async getWorkspace(
		workspaceId: UUID,
		localWorkspaceDb?: Stores["localWorkspaceDatabase"]
	): Promise<Workspace> {
		if (workspaceId === config.debugWorkspaceId) {
			if (!localWorkspaceDb) return loadDebugWorkspace();

			const db = await get(localWorkspaceDb);

			if (!(await db.hasWorkspace(config.debugWorkspaceId))) return loadDebugWorkspace();

			return db.getWorkspace(config.debugWorkspaceId);
		}

		const request = await fetch(`${config.endpointUrl}/api/workspace/${workspaceId}`);
		const response: Workspace = { ...(await request.json()), local: false};
		
		return response;
	}

	async getSettings(): Promise<Setting[]> {
		throw "NYI";
	}

	async getSetting(id: UUID): Promise<Setting> {
		throw "NYI";
	}

	async setSetting(id: UUID, value: any): Promise<boolean> {
		// Returns true if successful, false otherwise?
		throw "NYI";
	}

	async login(user: string, pass: string): Promise<boolean> {
		throw "NYI";
	}

	async logout(): Promise<void> {
		throw "NYI";
	}

	async getUsers(): Promise<User[]> {
		throw "NYI";
	}

	async getUser(userId: UUID): Promise<User> {
		throw "NYI";
	}

	async createUser(user: User): Promise<boolean> {
		// Returns true if successful, false otherwise
		throw "NYI";
	}

	async editUser(userId: UUID, user: User): Promise<boolean> {
		// Returns true if successful, false otherwise
		throw "NYI";
	}
}

export const api = new DiktifyAPI();

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

export async function parseDebugWorkspace(jsonData: any) {
	const ws: Workspace = {
		...jsonData,
		id: config.debugWorkspaceId,
		local: true
	};

	for (const id of Object.keys(ws.submissions)) {
		const sub = ws.submissions[id] as unknown as Submission;

		sub.data.text = processString(sub.data.text);

		if (sub.data.text.length < ws.template.length * config.incompleteFraction) {
			// delete ws.submissions[id];
			ws.submissions[id].state = "REJECTED";
			continue;
		}

		const mistakeArr = [...sub.data.mistakes];

		const diff = new Diff(parseIgnoreBounds(sub.data.text, sub.data.ignoreText), ws.template);
		diff.calc();
		const subRediff = diff.getMistakes();

		// let regMistakeCountOffset = 0;

		for (const m of sub.data.mistakes) {
			if (m.subtype === "MERGED" && m.children.length === 0) {
				mistakeArr.splice(mistakeArr.findIndex((cm) => cm === m), 1);
			}

			// if (m.subtype === "MERGED") {
			// 	let unmerge = false;

			// 	for (const child of m.children) {
			// 		let has = false;

			// 		for (const reM of subRediff) {
			// 			if (await reM.genHash() === child.hash) has = true; 
			// 		}

			// 		if (!has) {
			// 			unmerge = true;
			// 			break;
			// 		}
			// 	}

			// 	if (unmerge) {
			// 		if (mistakeInRegister(m.hash, ws.register)) {
			// 			regMistakeCountOffset++;
			// 		}
			// 	}
			// }
		}

		sub.data.mistakes = mistakeArr;

		const newMistakes = await reprocessDiff(sub, subRediff);

		sub.data.mistakes = newMistakes;

		if (sub.data.mistakes.length > config.rejectedMistakeThreshold) {
			ws.submissions[id].state = "REJECTED";
			continue;
		}

		const registeredCount = countRegisteredMistakes(sub, ws.register);
		if (registeredCount === sub.data.mistakes.length) {
			ws.submissions[id].state = "DONE";
		} else if (registeredCount === 0) {
			ws.submissions[id].state = "UNGRADED";
		} else {
			ws.submissions[id].state = "WIP";
		}
	}

	return ws;
}

async function reprocessDiff(rawData: Submission, rawMistakes: Mistake[]) {
	const mergedMistakes = rawData.data.mistakes.filter((m) => m.subtype === "MERGED");
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
	mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

	return mistakes;
}

async function loadDebugWorkspace(): Promise<Workspace> {
	// const req = await fetch("/output-prod.json");
	const req = await fetch("/output-2023.json");
	
	return parseDebugWorkspace(await req.json());
}

// function calcAvgRegisteredMistakes(ws: Workspace & { submissions: Record<string, Submission> }) {
// 	const submAvg: number[] = [];

// 	for (const subm of Object.values(ws.submissions)) {
// 		if (subm.data.mistakes.length > ws.template.length * config.incompleteFraction)
// 			continue;

// 		const rawMistakes = subm.data.mistakes.flatMap((m) => m.subtype === "MERGED" ? m.children : m);
// 		const registeredMistakes = subm.data.mistakes
// 			.filter((m) => mistakeInRegister(m.hash, ws.register))
// 			.flatMap((m) => m.subtype === "MERGED" ? m.children : m);

// 		submAvg.push(registeredMistakes.length / rawMistakes.length);
// 	}

// 	return submAvg.reduce((acc, cur) => acc + cur) / submAvg.length;
// }
