import type { ActionDescriptor, ActionHash } from "../types";
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
		this.hashes[await this.getActionHash(action)] = { desc };
	}

	async isActionInRegister(action: Action) {
		const hash = await this.getActionHash(action);

		return hash in this.hashes;
	}

	getAction(hash: string) {
		return this.hashes[hash];
	}

	private async getActionHash(action: Action) {
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