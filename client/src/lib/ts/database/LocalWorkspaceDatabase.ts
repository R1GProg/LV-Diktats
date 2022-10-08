import config from "$lib/config.json";
import type { RegisterEntry, RegisterEntryData, Submission, SubmissionData, SubmissionID, SubmissionPreview, UUID, Workspace } from "@shared/api-types";
import type { MistakeData } from "@shared/diff-engine";
import type { MistakeStore, RegisterStore, SubmissionStore, WorkspaceStore } from "@shared/api-types/database";
import BrowserDatabase from "./BrowserDatabase";

export type ExportedWorkspace = Workspace & { submissions: Record<SubmissionID, Submission> }

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

	private async addMistake(workspace: UUID, m: MistakeData) {
		const mistakeData: MistakeStore<UUID> = {
			id: m.id,
			hash: m.id,
			type: m.type,
			subtype: m.subtype,
			actions: m.actions,
			boundsCheck: m.boundsCheck,
			boundsCorrect: m.boundsCorrect,
			boundsDiff: m.boundsDiff,
			word: m.word,
			wordCorrect: m.wordCorrect,
			mergedId: m.mergedId,
			children: m.children.map((c) => c.id),
			workspace
		}

		await Promise.all(m.children.map((m) => this.addMistake(workspace, m)));

		return this.write("mistakes", null, mistakeData);
	}

	private async addSubmission(workspace: UUID, subm: Submission) {
		const submData: SubmissionStore<UUID> = {
			id: subm.id,
			state: subm.state,
			workspace,
			data: {
				text: subm.data.text,
				ignoreText: subm.data.ignoreText,
				metadata: subm.data.metadata,
				mistakes: subm.data.mistakes.map((m) => m.id)
			}
		}

		await Promise.all(subm.data.mistakes.map((m) => this.addMistake(workspace, m)));

		return this.write("submissions", null, submData);
	}

	private async addWorkspace(workspace: ExportedWorkspace) {
		const data: WorkspaceStore<UUID> = {
			id: workspace.id,
			name: workspace.name,
			template: workspace.template,
			submissions: Object.keys(workspace.submissions),
			register: workspace.register.map((r) => r.id),
			mergedMistakes: []
		};

		return this.write("workspaces", null, data);
	}

	async addRegisterEntry(workspace: UUID, entry: RegisterEntry) {
		const data: RegisterStore<UUID> = {
			id: entry.id,
			mistakes: entry.mistakes,
			description: entry.description,
			ignore: entry.ignore,
			count: entry.count,
			workspace
		};

		return this.write("register", null, data);
	}

	async importWorkspace(ws: ExportedWorkspace) {
		await Promise.all([
			this.addWorkspace(ws),
			...Object.values(ws.submissions).map((s) => this.addSubmission(ws.id, s)),
			...ws.register.map((e) => this.addRegisterEntry(ws.id, e))
		]);
	}

	async getSubmission(ws: UUID, id: SubmissionID): Promise<Submission> {
		throw "NYI";
	}

	async getSubmissionPreview(ws: UUID, id: SubmissionID): Promise<SubmissionPreview> {
		throw "NYI";
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


}
