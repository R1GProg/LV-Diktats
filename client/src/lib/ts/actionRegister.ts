import type { ActionHash, ActionType } from "@shared/diff-engine/build/Action";
import type Action from "@shared/diff-engine/build/Action";
import config from "../config.json"

export interface ActionDescriptor {
	desc: string,
}

function buf2hex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)]
		.map(x => x.toString(16).padStart(2, "0"))
		.join("");
}

export class ActionRegister {
	private hashes: ActionHash[] = null;

	constructor() {
		
	}

	async addActionToRegister(action: Action, desc: string) {
		// this.hashes[await this.getActionHash(action)] = { desc };
		await fetch(config.endpointUrl + "/api/submitMistake", {
			method: "POST",
			headers: {
				'Content-Type': 'application/json'
			},
			body: `{"hash":"${action.hash}", "description": "${desc}"}`
		});
	}

	async loadActionRegister() {
		this.hashes = await (await fetch(`${config.endpointUrl}/api/listMistakes`)).json();
		// console.log(this.hashes);
	}

	async isActionInRegister(action: Action) {
		return this.hashes.includes(await action.hash);
	}

	async getActionDescriptor(hash: string) {
		let request = await fetch(config.endpointUrl + "/api/getMistake?hash=" + hash);
		let result = await request.json();
		return {
			desc: result.description
		} as ActionDescriptor;
	}
}

export const actionRegister = new ActionRegister();
