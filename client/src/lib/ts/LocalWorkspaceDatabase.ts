import config from "$lib/config.json";
import type { Workspace } from "@shared/api-types";
import { get } from "svelte/store";
import type { Stores } from "./stores";

export default class LocalWorkspaceDatabase {
	private db: IDBDatabase | null = null;

	private dbInitPromise: Promise<void>;

	private dbInitResolve: (() => void) | null = null;

	private dbInitReject: (() => void) | null = null;

	private workspace: Stores["workspace"];

	constructor(workspace: Stores["workspace"]) {
		const openReq = window.indexedDB.open("LocalWorkspaces", 1);

		this.workspace = workspace;

		this.dbInitPromise = new Promise<void>((res, rej) => {
			this.dbInitResolve = res;
			this.dbInitReject = rej;
		});

		openReq.onerror = () => {
			console.warn(`Error initializing local workspace database! (Error: ${openReq.error})`);
			this.dbInitReject!();
		};

		openReq.onsuccess = async () => {
			console.log("Local workspace database initialized!");
			this.db = openReq.result;

			if (config.localWorkspacesSingleSession) {
				await this.clearStore("workspaces");
			}

			this.dbInitResolve!();
		}

		openReq.onupgradeneeded = async () => {
			this.db = openReq.result;

			if (await this.ensureObjectStore("workspaces", "id") === null) {
				console.warn("Failed to create local workspace object store!");
				this.dbInitReject!();
			} else {
				console.log("Local workspace database created!");
				this.dbInitResolve!();
			}
		};
	}

	databaseInit() {
		return this.dbInitPromise;
	}

	private write<T>(obj: string, key: string, val: T) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to write to database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readwrite").objectStore(obj);
			const req = objStore.add(val, key);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			}
		});
	}

	private update<T>(obj: string, key: string | null, val: T) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to write to database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readwrite").objectStore(obj);
			const req = objStore.put(val, key ?? undefined);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			}
		});
	}

	private read<T>(obj: string, key: string): Promise<T> {
		return new Promise<T>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to read database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readonly").objectStore(obj);
			const req = objStore.get(key);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res(req.result as T);
			};
		});
	}

	private delete(obj: string, key: string): Promise<boolean> {
		return new Promise<boolean>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to delete from database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readwrite").objectStore(obj);
			const req = objStore.delete(key);

			req.onerror = (ev) => {
				res(false);
			};

			req.onsuccess = (ev) => {
				res(true);
			};
		});
	}

	private getKeys(obj: string): Promise<string[]> {
		return new Promise<string[]>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to read database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readonly").objectStore(obj);
			const req = objStore.getAllKeys();

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res(req.result as string[]);
			};
		});
	}

	private createStore(name: string, keyPath: string | null) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to create store before database initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.createObjectStore(name, {
				keyPath,
			});

			objStore.transaction.oncomplete = () => {
				res();
			};

			objStore.transaction.onerror = (ev) => {
				rej(ev);
			}
		});
	}

	private async storeHasKey(store: string, key: string): Promise<boolean | null> {
		if (this.db === null) {
			console.warn("Attempt to read store before database initialization!");
			return null;
		}

		const keys = await this.getKeys(store);
		return keys.includes(key);
	}

	// Returns true if a new store was created, false if the store exists, null if failed
	private async ensureObjectStore(name: string, keypath: string | null): Promise<boolean | null> {
		if (this.db === null) {
			console.warn("Attempt to ensure store before database initialization!");
			return null;
		}

		const existingStores = Array.from(this.db.objectStoreNames);

		if (existingStores.includes(name)) {
			return false;
		} else {
			await this.createStore(name, keypath);
			return true;
		}
	}

	private clearStore(obj: string) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to delete from database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readwrite").objectStore(obj);
			const req = objStore.clear();

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			};
		});
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
