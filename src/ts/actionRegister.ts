import type { ActionDescriptor, ActionHash } from "../types";
import config from "../config.json"
import type { Action, ActionType } from "../types";

function buf2hex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)]
		.map(x => x.toString(16).padStart(2, "0"))
		.join("");
}

export class ActionRegister {
	private hashes: Record<ActionHash, ActionDescriptor> = {};

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

	async isActionInRegister(action: Action, writeHashToAction: boolean = false) {
		const hash = await this.getActionHash(action);
		if (writeHashToAction) action.hash = hash;

		let request = await fetch(config.endpointUrl + "/api/getMistake?hash=" + hash);
		let result = await request.text();

		return result !== "null";
	}

	async getActionDescriptor(hash: string) {
		let request = await fetch(config.endpointUrl + "/api/getMistake?hash=" + hash);
		let result = await request.json();
		return {
			desc: result.description
		} as ActionDescriptor;
	}

	private async getActionHash(action: Action, force = false) {
		if (action.hash && !force) return action.hash;

		const dict: Record<ActionType, number> = {
			"NONE": 0,
			"ADD": 1,
			"DEL": 2,
			"SUB": 3,
		}
	
		const keyObject = {
			type: dict[action.type],
			index: action.indexCorrect,
			char: action.char.trim().charCodeAt(0)
		};
	
		const hash = await crypto.subtle.digest("SHA-256", Uint8Array.from(Object.values(keyObject)));
		return buf2hex(hash) as ActionHash;
	}
}

export const actionRegister = new ActionRegister();
