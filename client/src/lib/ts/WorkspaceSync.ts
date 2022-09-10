import { workspace, activeSubmission } from "$lib/ts/stores";
import type { Workspace } from "$lib/types";
import { get } from "svelte/store";

export interface WorkspaceSyncChanges {
	register: RegisterChange[],
	submissions: string[],
}

export interface RegisterChange {
	id: string,
	type: RegisterChangeType,
}

export type WorkspaceSyncCallback = (w: Workspace, changes: WorkspaceSyncChanges, autosave: boolean) => void;
export type RegisterChangeType = "ADD" | "EDIT" | "DELETE";

export default class WorkspaceSync {
	private prevWorkspace: Workspace | null = null;

	private activeChanges: WorkspaceSyncChanges = { register: [], submissions: [] };

	private saveCbs: WorkspaceSyncCallback[] = [];

	private hasUnsavedChanges = false;

	private autosaveTime: number; // In seconds

	constructor(autosaveTime: number) {
		this.autosaveTime = autosaveTime;

		workspace.subscribe((w) => { this.wsListener(w) });
		setInterval(() => { this.autosave(); }, this.autosaveTime * 1000);
	}

	private autosave() {
		const activeWorkspace = get(workspace);

		if (activeWorkspace === null) return;

		this.save(activeWorkspace, true);
	}

	private wsListener(w: Workspace | null) {
		if (this.prevWorkspace === null) {
			this.prevWorkspace = w;
			return;
		}
		
		if (w === null || w !== this.prevWorkspace && this.hasUnsavedChanges) {
			this.save(this.prevWorkspace, false);
			return;
		}
		
		const activeId = get(activeSubmission);
		
		if (activeId === null) return;
		if (this.activeChanges.submissions.includes(activeId)) return;
		
		this.activeChanges.submissions.push(activeId);
		this.hasUnsavedChanges = true;
	}

	private save(w: Workspace, autosave: boolean) {
		for (const cb of this.saveCbs) {
			cb(w, this.activeChanges, autosave);
		}

		this.clearActiveChanges();
	}

	addSaveCallback(cb: WorkspaceSyncCallback) {
		if (this.saveCbs.includes(cb)) return;

		this.saveCbs.push(cb);
	}

	hasActiveChanges() {
		return this.hasUnsavedChanges;
	}

	getActiveChanges() {
		return this.activeChanges;
	}

	clearActiveChanges() {
		this.activeChanges = { register: [], submissions: [] };
		this.hasUnsavedChanges = false;
	}

	addRegisterChange(id: string, type: RegisterChangeType) {
		this.activeChanges.register.push({ id, type });
		this.hasUnsavedChanges = true;
	}
}
