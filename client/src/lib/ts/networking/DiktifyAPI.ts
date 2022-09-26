import config from "$lib/config.json";
import type { RegisterEntry, Setting, Submission, SubmissionID, User, UUID, Workspace, WorkspacePreview } from "@shared/api-types";

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
			return [{ id: "debugworkspaceid", name: "Mazsālīto gurķu blūzs (DEBUG)" }];
		}
		
		// TODO: SERVER FETCH
		const request = await fetch(`${config.endpointUrl}/api/workspaces`);
		const response: WorkspacePreview[] = await request.json();
		return response;
	}

	async getWorkspace(workspaceId: UUID): Promise<Workspace> {
		if (workspaceId === "debugworkspaceid") {
			return loadDebugWorkspace();
		}

		// TODO: SERVER FETCH
		const request = await fetch(`${config.endpointUrl}/api/workspace/${workspaceId}`);
		const response: Workspace = await request.json();
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

async function loadDebugWorkspace(): Promise<Workspace> {
	const req = await fetch("/output.json");
	const ws = await req.json() as Workspace;

	for (const id of Object.keys(ws.submissions)) {
		const sub = ws.submissions[id] as Submission;

		if (sub.data.text.length < ws.template.length * config.incompleteFraction) {
			delete ws.submissions[id];
		}
	}

	return ws;
}
