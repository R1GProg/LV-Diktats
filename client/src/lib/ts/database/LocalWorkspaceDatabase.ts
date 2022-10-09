import config from "$lib/config.json";
import type { ExportedWorkspace, RegisterEntry, RegisterEntryData, Submission, SubmissionData, SubmissionID, SubmissionPreview, UUID, Workspace } from "@shared/api-types";
import type { MistakeData, MistakeHash, MistakeId } from "@shared/diff-engine";
import type { MistakeStore, RegisterStore, SubmissionStore, WorkspaceStore } from "@shared/api-types/database";
import BrowserDatabase from "./BrowserDatabase";

export default class LocalWorkspaceDatabase extends BrowserDatabase {
	constructor() {
		super({
			name: "LocalWorkspaces",
			initEmpty: config.localWorkspacesSingleSession,
			stores: [
				{ name: "mistakes", keyPath: "id" },
				{ name: "register", keyPath: "id" },
				{ name: "submissions", keyPath: "id" },
				{ name: "workspaces", keyPath: "id" },
			]
		});
	}

	// Tracks what hashes have been added during a workspace import
	mistakeHashLog: Record<MistakeHash, MistakeId> | null = null;

	private async addMistake(workspace: UUID, m: MistakeData): Promise<MistakeId> {
		if (this.mistakeHashLog === null) {
			const existingMistake = await this.findOne<MistakeStore<UUID>>("mistakes", (checkM) => {
				return checkM.hash === m.hash && checkM.workspace === workspace;
			});
	
			if (existingMistake) return existingMistake.id;
		} else if (m.hash in this.mistakeHashLog) {
			return this.mistakeHashLog[m.hash];
		} else if (this.mistakeHashLog !== null) {
			this.mistakeHashLog[m.hash] = m.id;
		}

		const mistakeData: MistakeStore<UUID> = {
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
		await this.write("mistakes", null, mistakeData);

		return mistakeData.id;
	}

	private async addSubmission(workspace: UUID, subm: Submission) {
		// MistakeID will map to itself it a mistake with the hash doesnt exist yet
		// If a mistake with the hash is already stored, MistakeID will map to the
		// ID of that mistake
		const mistakeIDMap: Record<MistakeId, UUID> = {};
		const mistakeIDMapPromises: Promise<void>[] = [];

		for (const mistake of subm.data.mistakes) {
			mistakeIDMapPromises.push(new Promise<void>(async (res, rej) => {
				const addedID = await this.addMistake(workspace, mistake);

				mistakeIDMap[mistake.id] = addedID;
				res();
			}));
		}

		await Promise.all(mistakeIDMapPromises);

		const submData: SubmissionStore<UUID> = {
			id: subm.id,
			state: subm.state,
			workspace,
			data: {
				text: subm.data.text,
				ignoreText: subm.data.ignoreText,
				metadata: subm.data.metadata,
				mistakes: subm.data.mistakes.map((m) => ({
					id: mistakeIDMap[m.id],
					hash: m.hash,
					boundsDiff: m.boundsDiff,
					boundsCheck: m.boundsCheck,
					actions: m.actions.map((a) => ({
						indexDiff: a.indexDiff,
						indexCheck: a.indexCheck
					})),
					children: m.children.map((child) => ({
						id: mistakeIDMap[child.id],
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

		return this.write("submissions", null, submData);
	}

	private async addWorkspace(workspace: ExportedWorkspace) {
		const data: WorkspaceStore<UUID> = {
			id: workspace.id,
			name: workspace.name,
			template: workspace.template,
			submissions: Object.keys(workspace.submissions),
			register: workspace.register.map((r) => r.id)
		};

		return this.write("workspaces", null, data);
	}

	async addRegisterEntry(workspace: UUID, entry: RegisterEntry) {
		const data: RegisterStore<UUID> = {
			id: entry.id,
			mistakes: entry.mistakes,
			description: entry.description,
			ignore: entry.ignore,
			workspace
		};

		return this.write("register", null, data);
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

	async getMistakeById(ws: UUID, submId: SubmissionID, mistakeId: MistakeId): Promise<MistakeData | null> {
		const subm = await this.read<SubmissionStore<UUID>>("submissions", submId);
		const targetMistakeStore = await this.findOne<MistakeStore<UUID>>("mistakes", (m) => {
			return m.workspace === ws && m.id === mistakeId;
		});
		const submMistakeData = subm?.data.mistakes.find((m) => m.id === mistakeId);

		if (!subm || !targetMistakeStore || !submMistakeData) {
			this.warn("Attempt to get invalid mistake", { submission: submId, mistake: mistakeId });
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

		const childMistakes = await this.fillKeyArray<MistakeStore<UUID>>("mistakes", targetMistakeStore.children);

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

	async getMistakeByHash(ws: UUID, submId: SubmissionID, mistakeHash: MistakeHash): Promise<MistakeData | null> {
		const targetMistake = await this.findOne<MistakeStore<UUID>>("mistakes", (m) => {
			return m.hash === mistakeHash && m.workspace === ws;
		});

		if (targetMistake === null) return null;

		return this.getMistakeById(ws, submId, targetMistake.id);
	}

	async getSubmissionPreview(ws: UUID, id: SubmissionID): Promise<SubmissionPreview | null> {
		const subm = await this.findOne<SubmissionStore<UUID>>("submissions", (val) => {
			return val.id === id && val.workspace === ws;
		});

		if (subm === null) return null;

		return {
			id,
			state: subm.state,
			mistakeCount: subm.data.mistakes.length
		};
	}

	async getSubmissionData(ws: UUID, id: SubmissionID): Promise<SubmissionData | null> {
		const subm = await this.findOne<SubmissionStore<UUID>>("submissions", (val) => {
			return val.id === id && val.workspace === ws;
		});

		if (subm === null) return null;

		const mistakes: (MistakeData | null)[] = await Promise.all(subm.data.mistakes.map((m) => this.getMistakeById(ws, id, m.id)));

		if (mistakes.includes(null)) return null;

		return {
			...subm.data,
			mistakes: mistakes as MistakeData[]
		}
	}

	async getWorkspaces(): Promise<{ id: UUID, name: string }> {
		throw "NYI";
	}

	async getWorkspace(ws: UUID): Promise<Workspace> {
		throw "NYI";
	}

	async exportWorkspace(ws: UUID): Promise<ExportedWorkspace> {
		throw "NYI";
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
