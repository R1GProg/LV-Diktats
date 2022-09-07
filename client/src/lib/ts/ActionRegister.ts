import type { RegisterEntry } from "$lib/types";
import type { Mistake, MistakeHash } from "@shared/diff-engine";
import { workspace } from "./stores";
import { get } from "svelte/store";
import { updateLocalWorkspace } from "./WorkspaceLocalStorage";

function pushToLocalStorage(data: RegisterEntry) {
	const existingData: RegisterEntry[] = JSON.parse(localStorage.getItem("temp-register") ?? "[]");
	existingData.push(data);
	localStorage.setItem("temp-register", JSON.stringify(existingData));
}

function updateInLocalStorage(data: RegisterEntry) {
	const existingData: RegisterEntry[] = JSON.parse(localStorage.getItem("local-workspaces") ?? "[]");
	const existing = existingData.findIndex((w) => w.hash === data.hash);
	
	existingData[existing] = data;
	localStorage.setItem("local-workspaces", JSON.stringify(existingData));
}

function deleteFromLocalStorage(hash: string) {
	const existingData: RegisterEntry[] = JSON.parse(localStorage.getItem("local-workspaces") ?? "[]");
	const existing = existingData.findIndex((w) => w.hash === hash);
	
	existingData.splice(existing, 1);
	localStorage.setItem("local-workspaces", JSON.stringify(existingData));
}

export class ActionRegister {
	constructor() {}

	async addMistakeToRegister(mistake: Mistake, data: RegisterEntry) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return;

		const hash = await mistake.genHash(true);
		const regData = {...data, hash};

		workspaceVal.register[hash] = regData;
		// updateLocalWorkspace(workspaceVal);
		pushToLocalStorage(regData);
	}

	// Returns true if update successful
	async updateMistakeInRegister(mistake: Mistake | MistakeHash, data: RegisterEntry) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return false;
		if (!this.isMistakeInRegister(mistake)) return false;

		if (typeof mistake === "string") {
			const regData = {...data, hash: mistake};

			workspaceVal.register[mistake] = regData;
			pushToLocalStorage(regData);
		} else {
			const hash = await mistake.genHash();
			const regData = {...data, hash}
			workspaceVal.register[hash] = regData;
			pushToLocalStorage(regData);
		}

		// updateLocalWorkspace(workspaceVal);
		return true;
	}

	// Returns true if successful
	async deleteMistakeFromRegister(mistake: Mistake | MistakeHash) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return false;
		if (!this.isMistakeInRegister(mistake)) return false;

		let hash: MistakeHash;

		if (typeof mistake === "string") {
			hash = mistake;
		} else {
			hash = await mistake.genHash();
		}

		delete workspaceVal.register[hash];
		deleteFromLocalStorage(hash);

		return true;
	}

	async isMistakeInRegister(mistake: Mistake | MistakeHash) {
		const workspaceVal = get(workspace);
		if (workspaceVal === null) return false;

		if (typeof mistake === "string") {
			return Object.keys(workspaceVal.register).includes(mistake);
		} else {
			return Object.keys(workspaceVal.register).includes(await mistake.genHash());
		}
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
