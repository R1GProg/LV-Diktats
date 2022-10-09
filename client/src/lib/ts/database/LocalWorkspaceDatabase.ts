import config from "$lib/config.json";
import type { ExportedWorkspace, RegisterEntry, RegisterEntryData, Submission, SubmissionData, SubmissionID, SubmissionPreview, UUID, Workspace, WorkspacePreview } from "@shared/api-types";
import type { MistakeData, MistakeHash, MistakeId } from "@shared/diff-engine";
import type { MistakeStore, RegisterStore, SubmissionStore, WorkspaceStore } from "@shared/api-types/database";
import BrowserDatabase from "./BrowserDatabase";

type DBMistakeId = string;
type DBRegisterId = string;
type DBSubmissionID = string;
type DBWorkspaceID = UUID;

function dbID(workspace: UUID, id: UUID) {
	return `${workspace}-${id}`;
}

export default class LocalWorkspaceDatabase extends BrowserDatabase {
	constructor() {
		super({
			name: "LocalWorkspaces",
			initEmpty: config.localWorkspacesSingleSession,
			stores: [
				{ name: "mistakes" },
				{ name: "register" },
				{ name: "submissions" },
				{ name: "workspaces", keyPath: "id" },
			]
		});
	}

	// Tracks what hashes have been added during a workspace import
	mistakeHashLog: Record<MistakeHash, MistakeId> | null = null;

	private async addMistake(workspace: UUID, m: MistakeData): Promise<MistakeId> {
		if (this.mistakeHashLog === null) {
			const existingMistake = await this.read<MistakeStore<DBMistakeId>>("mistakes", dbID(workspace, m.hash));

			if (existingMistake) return existingMistake.id;
		} else if (m.hash in this.mistakeHashLog) {
			return this.mistakeHashLog[m.hash];
		} else if (this.mistakeHashLog !== null) {
			this.mistakeHashLog[m.hash] = m.id;
		}

		const mistakeData: MistakeStore<DBMistakeId> = {
			id: m.id,
			hash: m.hash,
			type: m.type,
			subtype: m.subtype,
			actions: m.actions.map((a) => ({
				id: a.id,
				type: a.type,
				subtype: a.subtype,
				indexCorrect: a.indexCorrect,
				char: a.char,
			})),
			boundsCorrect: m.boundsCorrect,
			word: m.word,
			wordCorrect: m.wordCorrect,
			mergedId: m.mergedId,
			children: m.children.map((c) => c.id),
			workspace
		}

		await Promise.all(m.children.map((m) => this.addMistake(workspace, m)));
		await this.write("mistakes", dbID(workspace, m.hash), mistakeData);

		return mistakeData.id;
	}

	private async addSubmission(workspace: UUID, subm: Submission) {
		await Promise.all(subm.data.mistakes.map((m) => this.addMistake(workspace, m)));

		const submData: SubmissionStore<DBSubmissionID> = {
			id: subm.id,
			state: subm.state,
			workspace,
			data: {
				text: subm.data.text,
				ignoreText: subm.data.ignoreText,
				metadata: subm.data.metadata,
				mistakes: subm.data.mistakes.map((m) => ({
					id: m.id,
					hash: m.hash,
					boundsDiff: m.boundsDiff,
					boundsCheck: m.boundsCheck,
					actions: m.actions.map((a) => ({
						indexDiff: a.indexDiff,
						indexCheck: a.indexCheck
					})),
					children: m.children.map((child) => ({
						id: child.id,
						hash: child.hash,
						boundsDiff: child.boundsDiff,
						boundsCheck: child.boundsCheck,
						actions: child.actions.map((a) => ({
							indexDiff: a.indexDiff,
							indexCheck: a.indexCheck
						}))
					}))
				}))
			}
		}

		return this.write("submissions", dbID(workspace, subm.id), submData);
	}

	private async addWorkspace(workspace: ExportedWorkspace) {
		const data: WorkspaceStore<DBWorkspaceID> = {
			id: workspace.id,
			name: workspace.name,
			template: workspace.template,
			submissions: Object.keys(workspace.submissions),
			register: workspace.register.map((r) => r.id)
		};

		return this.write("workspaces", null, data);
	}

	async addRegisterEntry(workspace: UUID, entry: RegisterEntry) {
		const data: RegisterStore<DBRegisterId> = {
			id: entry.id,
			mistakes: entry.mistakes,
			description: entry.description,
			ignore: entry.ignore,
			workspace
		};

		return this.write("register", dbID(workspace, entry.id), data);
	}

	async importWorkspace(ws: ExportedWorkspace) {
		this.mistakeHashLog = {};

		await Promise.all([
			this.addWorkspace(ws),
			...Object.values(ws.submissions).map((s) => this.addSubmission(ws.id, s)),
			...ws.register.map((e) => this.addRegisterEntry(ws.id, e))
		]);

		this.mistakeHashLog = null;
	}

	async getMistakeByHash(ws: UUID, submId: SubmissionID, mistakeHash: MistakeHash): Promise<MistakeData | null> {
		const subm = await this.read<SubmissionStore<DBSubmissionID>>("submissions", dbID(ws, submId));
		const targetMistakeStore = await this.read<MistakeStore<DBMistakeId>>("mistakes", dbID(ws, mistakeHash));
		const submMistakeData = subm?.data.mistakes.find((m) => m.hash === mistakeHash);

		if (!subm || !targetMistakeStore || !submMistakeData) {
			this.warn("Attempt to get invalid mistake", { submission: submId, mistake: mistakeHash });
			return null;
		}

		// Fill basic mistake data
		const mistakeData: MistakeData = {
			...targetMistakeStore,
			actions: targetMistakeStore.actions.map((a, i) => {
				const submActionData = submMistakeData.actions[i];

				return {
					...a,
					indexDiff: submActionData!.indexDiff,
					indexCheck: submActionData!.indexCheck
				};
			}),
			boundsDiff: submMistakeData.boundsDiff,
			boundsCheck: submMistakeData.boundsCheck,
			children: []
		};

		const childMistakes = await this.fillKeyArray<MistakeStore<DBMistakeId>>("mistakes", targetMistakeStore.children);

		// Fill children
		for (const child of childMistakes) {
			const childSubmData = submMistakeData.children.find((c) => c.id === child.id)!;
			
			mistakeData.children.push({
				...child,
				actions: targetMistakeStore.actions.map((a, i) => {
					const submActionData = childSubmData.actions[i];
	
					return {
						...a,
						indexDiff: submActionData!.indexDiff,
						indexCheck: submActionData!.indexCheck
					};
				}),
				boundsDiff: childSubmData.boundsDiff,
				boundsCheck: childSubmData.boundsCheck,
				children: []
			});
		}

		return mistakeData;
	}

	// async getMistakeByHash(ws: UUID, submId: SubmissionID, mistakeHash: MistakeHash): Promise<MistakeData | null> {
	// 	const targetMistake = await this.findOne<MistakeStore<UUID>>("mistakes", (m) => {
	// 		return m.hash === mistakeHash && m.workspace === ws;
	// 	});

	// 	if (targetMistake === null) return null;

	// 	return this.getMistakeById(ws, submId, targetMistake.id);
	// }

	async getSubmissionPreview(ws: UUID, id: SubmissionID): Promise<SubmissionPreview | null> {
		const subm = await this.read<SubmissionStore<DBSubmissionID>>("submissions", dbID(ws, id));

		if (subm === null) return null;

		return {
			id,
			state: subm.state,
			mistakeCount: subm.data.mistakes.length
		};
	}

	async getSubmissionData(ws: UUID, id: SubmissionID): Promise<SubmissionData | null> {
		const subm = await this.read<SubmissionStore<DBSubmissionID>>("submissions", dbID(ws, id));

		if (subm === null) return null;

		const mistakes: (MistakeData | null)[] = await Promise.all(subm.data.mistakes.map((m) => this.getMistakeByHash(ws, id, m.hash)));

		if (mistakes.includes(null)) return null;

		return {
			...subm.data,
			mistakes: mistakes as MistakeData[]
		}
	}

	async getSubmission(ws: UUID, id: SubmissionID): Promise<Submission | null> {
		const subm = await this.read<SubmissionStore<DBSubmissionID>>("submissions", dbID(ws, id));

		if (subm === null) return null;

		const mistakes: (MistakeData | null)[] = await Promise.all(subm.data.mistakes.map((m) => this.getMistakeByHash(ws, id, m.hash)));

		if (mistakes.includes(null)) return null;

		return {
			...subm,
			data: {
				...subm.data,
				mistakes: mistakes as MistakeData[]
			}
		}
	}

	async getWorkspaces(): Promise<WorkspacePreview[]> {
		const workspaces = await this.readAll<WorkspaceStore<DBWorkspaceID>>("workspaces");

		return workspaces.map((ws) => ({ id: ws.id, name: ws.name, local: true }));
	}

	async getWorkspace(ws: UUID): Promise<Workspace | null> {
		const workspace = await this.read<WorkspaceStore<DBWorkspaceID>>("workspaces", ws);

		if (!workspace) return null;

		const submissions: Record<SubmissionID, SubmissionPreview> = {};

		for (const subm of workspace.submissions) {
			submissions[subm] = (await this.getSubmissionPreview(ws, subm))!;
		}

		const register = await this.fillKeyArray<RegisterStore<DBRegisterId>>("register", workspace.register.map((r) => dbID(workspace.id, r)));

		return {
			id: workspace.id,
			name: workspace.name,
			template: workspace.template,
			register,
			submissions,
			local: true,
		};
	}

	async exportWorkspace(ws: UUID): Promise<ExportedWorkspace | null> {
		const wsData = await this.getWorkspace(ws);
		
		if (wsData === null) return null;

		const fillPromises: Promise<void>[] = [];
		const submissions: Record<SubmissionID, Submission> = {}

		for (const submID of Object.keys(wsData.submissions)) {
			fillPromises.push(new Promise<void>(async (res, rej) => {
				const subm = await this.getSubmission(ws, submID);

				if (subm === null) rej();

				submissions[submID] = subm!;
				res();
			}));
		}

		await Promise.all(fillPromises);

		return {
			...wsData,
			submissions
		};
	}

	async exportWorkspaceDatabase(ws: UUID) {
		const workspace = await this.read<WorkspaceStore<DBWorkspaceID>>("workspaces", ws);

		const submIDs = workspace.submissions.map((s) => dbID(ws, s));
		const submissions = await this.fillKeyArray<SubmissionStore<DBSubmissionID>>("submissions", submIDs);

		const mistakes = await this.findMany<MistakeStore<DBMistakeId>>("mistakes", (m) => {
			return m.workspace === ws;
		});

		const register = await this.findMany<RegisterStore<DBMistakeId>>("register", (r) => {
			return r.workspace === ws;
		});

		return {
			workspace,
			submissions,
			mistakes,
			register
		}
	}

	async updateSubmission(ws: UUID, subm: Submission) {
		throw "NYI";
	}

	async updateRegisterEntry(ws: UUID, data: RegisterEntryData) {
		throw "NYI";
	}

	async deleteRegisterEntry(ws: UUID, targetEntry: UUID) {
		throw "NYI";
	}

	clear() {
		return this.clearDB();
	}
}
