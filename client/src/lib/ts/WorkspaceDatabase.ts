import type { Workspace } from "@shared/api-types";

export default class WorkspaceDatabase {
	private db: IDBDatabase | null = null;

	private dbInitPromise: Promise<void>;

	private dbInitResolve: (() => void) | null = null;

	private dbInitReject: (() => void) | null = null;

	constructor() {
		const openReq = window.indexedDB.open("Workspaces", 1);

		this.dbInitPromise = new Promise<void>((res, rej) => {
			this.dbInitResolve = res;
			this.dbInitReject = rej;
		});

		openReq.onerror = () => {
			console.warn(`Error initializing the workspace database! (Error: ${openReq.error})`);
			this.dbInitReject!();
		};

		openReq.onsuccess = () => {
			console.log("Workspace database initialized!");
			this.db = openReq.result;
			this.dbInitResolve!();
		}

		openReq.onupgradeneeded = () => {
			this.db = openReq.result;
			const objStore = this.db.createObjectStore("workspaces", {
				keyPath: "key",
			});

			objStore.transaction.oncomplete = () => {
				console.log("Workspace database created!");
				this.dbInitResolve!();
			};
		};
	}

	databaseInit() {
		return this.dbInitPromise;
	}

	addWorkspace(w: Workspace) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to write to database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction("workspaces", "readwrite").objectStore("workspaces");
			const req = objStore.add(w);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			}
		});
	}

	getWorkspace(key: string) {
		return new Promise<Workspace>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to read database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction("workspaces", "readwrite").objectStore("workspaces");
			const req = objStore.get(key);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res({...req.result, id: "temp"} as Workspace);
			};
		});
	}

	getAvailableWorkspaces() {
		return new Promise<string[]>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to read database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction("workspaces", "readwrite").objectStore("workspaces");
			const req = objStore.getAllKeys();

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res(req.result as string[]);
			};
		});
	}

	updateWorkspace(w: Workspace) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				console.warn("Attempt to write to database before initialization!");
				rej();
				return;
			}
	
			const objStore = this.db.transaction("workspaces", "readwrite").objectStore("workspaces");
			const req = objStore.put(w);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			}
		});
	}

	async isWorkspaceInDatabase(key: string) {
		const keys = await this.getAvailableWorkspaces();
		return keys.includes(key);
	}
}
