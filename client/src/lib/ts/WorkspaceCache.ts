import type { Submission, SubmissionID, UUID } from "@shared/api-types";
import config from "$lib/config.json";
import type DiktifySocket from "$lib/ts/networking/DiktifySocket";

type CacheEntry = Record<SubmissionID, Submission>;

export default class WorkspaceCache {
	private db: IDBDatabase | null = null;

	private dbInitPromise: Promise<void>;

	private dbInitResolve: (() => void) | null = null;

	private dbInitReject: (() => void) | null = null;

	private ds: DiktifySocket;

	constructor(ds: DiktifySocket) {
		this.ds = ds;

		const openReq = window.indexedDB.open("WorkspaceCache", 1);

		this.dbInitPromise = new Promise<void>((res, rej) => {
			this.dbInitResolve = res;
			this.dbInitReject = rej;
		});

		openReq.onerror = () => {
			console.warn(`Error initializing the workspace database! (Error: ${openReq.error})`);
			this.dbInitReject!();
		};

		openReq.onsuccess = async () => {
			console.log("Workspace database initialized!");
			this.db = openReq.result;

			if (config.cacheSingleSession) {
				await this.clearEntireCache();
			}

			this.dbInitResolve!();
		}

		openReq.onupgradeneeded = async () => {
			this.db = openReq.result;

			if (await this.ensureObjectStore("submissionCache", null) === null) {
				console.warn("Failed to create submission cache object store!");
				this.dbInitReject!();
			} else {
				console.log("Workspace database created!");
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

	private update<T>(obj: string, key: string, val: T) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to write to database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction(obj, "readwrite").objectStore(obj);
			const req = objStore.put(val, key);

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

	async readSubmissionCache(workspace: UUID) {
		return this.read<CacheEntry>("submissionCache", workspace);
	}

	async isSubmissionCached(id: SubmissionID, workspace: UUID): Promise<boolean | null> {
		if (this.db === null) {
			console.warn("Attempt to read before database initialization!");
			return null;
		}

		if (!(await this.storeHasKey("submissionCache", workspace))) {
			return false;
		}

		const wsCache = await this.readSubmissionCache(workspace);
		return Object.keys(wsCache).includes(id);
	}

	async addSubmissionToCache(submission: Submission, workspace: UUID) {
		if (this.db === null) {
			console.warn("Attempt to write before database initialization!");
			return null;
		}

		const workspaceExists = await this.storeHasKey("submissionCache", workspace);
		const data = workspaceExists ? await this.readSubmissionCache(workspace) : {};

		data[submission.id] = submission;

		await this.update<CacheEntry>("submissionCache", workspace, data);
	}

	async removeSubmissionFromCache(id: SubmissionID, workspace: UUID) {
		if (this.db === null) {
			console.warn("Attempt to write before database initialization!");
			return null;
		}

		const workspaceExists = await this.storeHasKey("submissionCache", workspace);

		if (!workspaceExists) {
			console.warn(`Attempt to remove submission from a workspace cache (${workspace}) that doesn't exist!`);
			return;
		}

		const data = workspaceExists ? await this.readSubmissionCache(workspace) : {};

		if (!(id in data)) return;

		delete data[id];

		await this.update<CacheEntry>("submissionCache", workspace, data);
	}

	async updateSubmissionInCache(submission: Submission, workspace: UUID) {
		if (this.db === null) {
			console.warn("Attempt to write before database initialization!");
			return null;
		}

		const workspaceExists = await this.storeHasKey("submissionCache", workspace);

		if (!workspaceExists) {
			console.warn(`Attempt to update cache for a workspace that doesnt exist (${workspace})!`)
			return null;
		}

		const data = await this.readSubmissionCache(workspace);
		data[submission.id] = submission;

		await this.update<CacheEntry>("submissionCache", workspace, data);
	}

	async getSubmission(id: SubmissionID, workspace: UUID): Promise<Submission | null> {
		if (this.db === null) {
			console.warn("Attempt to read before database initialization!");
			return null;
		}

		if (await this.isSubmissionCached(id, workspace)) {
			return (await this.read<CacheEntry>("submissionCache", workspace))[id];
		} else {
			const subm = await this.ds.requestSubmission(id, workspace);
			await this.addSubmissionToCache(subm, workspace);
			return subm;
		}
	}

	async clearWorkspaceCache(workspace: UUID) {
		this.delete("submissionCache", workspace);
	}

	async clearEntireCache() {
		this.clearStore("submissionCache");
	}
}
