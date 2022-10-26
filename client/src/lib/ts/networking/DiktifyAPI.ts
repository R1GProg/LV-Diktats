import config from "$lib/config.json";
import type { RegisterEntry, Setting, Submission, SubmissionID, User, UUID, Workspace, WorkspacePreview } from "@shared/api-types";
import { get } from "svelte/store";
import type { Stores } from "../stores";
import { countRegisteredMistakes, mistakeInRegister } from "../util";

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
			return [{ id: config.debugWorkspaceId, name: "Krāsaina saule virs pelēkiem jumtiem	 (DEBUG)" }];
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

export async function parseDebugWorkspace(jsonData: any) {
	const ws: Workspace = {
		...jsonData,
		id: config.debugWorkspaceId,
		local: true
	};

	for (const id of Object.keys(ws.submissions)) {
		const sub = ws.submissions[id] as unknown as Submission;

		if (sub.data.text.length < ws.template.length * config.incompleteFraction) {
			// delete ws.submissions[id];
			ws.submissions[id].state = "REJECTED";
			continue;
		}

		const mistakeArr = [...sub.data.mistakes];

		for (const m of sub.data.mistakes) {
			if (m.subtype === "MERGED" && m.children.length === 0) {
				mistakeArr.splice(mistakeArr.findIndex((cm) => cm === m), 1);
			}
		}

		sub.data.mistakes = mistakeArr;

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

async function loadDebugWorkspace(): Promise<Workspace> {
	const req = await fetch("/output-prod.json");
	
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
