import type { RegisterEntry } from "$lib/types";
import type { Mistake } from "@shared/diff-engine";
import { workspace } from "./stores";
import { get } from "svelte/store";

export class ActionRegister {
	constructor() {}

	async addMistakeToRegister(mistake: Mistake, data: RegisterEntry) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return;

		const hash = await mistake.genHash(true);

		workspaceVal.register[hash] = data;
	}

	// Returns true if update successful
	async updateMistakeInRegister(mistake: Mistake, data: RegisterEntry) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return false;
		if (!this.isMistakeInRegister(mistake)) return false;

		const hash = await mistake.genHash();
		workspaceVal.register[hash] = data;

		return true;
	}

	// Returns true if successful
	async deleteMistakeFromRegister(mistake: Mistake) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return false;
		if (!this.isMistakeInRegister(mistake)) return false;

		const hash = await mistake.genHash();
		delete workspaceVal.register[hash];

		return true;
	}

	async isMistakeInRegister(mistake: Mistake) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return false;

		return Object.keys(workspaceVal.register).includes(await mistake.genHash());
	}

	async getMistakeData(mistake: Mistake) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return null;

		const hash = await mistake.genHash();

		if (!(await this.isMistakeInRegister(mistake))) {
			console.warn(`Attempt to get mistake data for unregistered mistake (ID: ${mistake.id}; hash: ${hash}`);
			return;
		}

		return workspaceVal.register[hash];		
	}

	// async addActionToRegister(action: Action, desc: string) {
	// 	// this.hashes[await this.getActionHash(action)] = { desc };
	// 	await fetch(config.endpointUrl + "/api/submitMistake", {
	// 		method: "POST",
	// 		headers: {
	// 			'Content-Type': 'application/json'
	// 		},
	// 		body: `{"hash":"${action.hash}", "description": "${desc}"}`
	// 	});
	// }

	// async loadActionRegister() {
	// 	this.hashes = await (await fetch(`${config.endpointUrl}/api/listMistakes`)).json();
	// 	// console.log(this.hashes);
	// }

	// async isActionInRegister(action: Action) {
	// 	return this.hashes.includes(await action.hash);
	// }

	// async getActionDescriptor(hash: string) {
	// 	let request = await fetch(config.endpointUrl + "/api/getMistake?hash=" + hash);
	// 	let result = await request.json();

	// 	return {
	// 		desc: result.description,
	// 		ignore: result.ignore ?? false,
	// 	} as RegistrationEntry;
	// }
}

export const actionRegister = new ActionRegister();
