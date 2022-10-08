import config from "$lib/config.json";
import type { Workspace } from "@shared/api-types";
import { get } from "svelte/store";
import BrowserDatabase from "./BrowserDatabase";
import type { Stores } from "$lib/ts/stores";

export default class LocalWorkspaceDatabase extends BrowserDatabase {
	private workspace: Stores["workspace"];

	constructor(workspace: Stores["workspace"]) {
		super({
			name: "LocalWorkspaces",
			initEmpty: config.localWorkspacesSingleSession,
			stores: [
				{
					name: "workspaces",
					keyPath: "id"
				}
			]
		});

		this.workspace = workspace;
	}

	updateWorkspace(ws: Workspace) {
		return this.update("workspaces", null, ws);
	}

	async updateActive() {
		const ws = await get(this.workspace);
		if (ws === null) return;

		return this.updateWorkspace(ws);
	}

	async hasWorkspace(id: string) {
		return (await this.getKeys("workspaces")).includes(id);
	}

	async getWorkspace(id: string) {
		return this.read<Workspace>("workspaces", id);
	}
}
