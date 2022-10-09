import type { UUID } from "@shared/api-types";

export interface DatabaseOpts {
	name: string;
	version?: number;
	stores: DatabaseStore[];
	initEmpty?: boolean;
}

export interface DatabaseStore {
	name: string;
	keyPath?: string;
}

function logContextToMsg(context: Record<string, string>) {
	const contextMsgArr = Object.keys(context).map((k) => `${k}: ${context[k]}`);
	return contextMsgArr.join(", ");
}

export default class BrowserDatabase {
	private db: IDBDatabase | null = null;

	private dbInitPromise: Promise<void>;

	private dbInitResolve: (() => void) | null = null;

	private dbInitReject: (() => void) | null = null;

	private opts: DatabaseOpts;

	private transaction: IDBTransaction | null = null;

	constructor(opts: DatabaseOpts) {
		this.opts = {
			version: 1,
			initEmpty: false,
			...opts
		};

		const openReq = window.indexedDB.open(this.opts.name, this.opts.version);

		this.dbInitPromise = new Promise<void>((res, rej) => {
			this.dbInitResolve = res;
			this.dbInitReject = rej;
		});

		openReq.onerror = () => {
			this.warn("Error initializing database!", { error: openReq.error!.message });
			this.dbInitReject!();
		};

		openReq.onsuccess = async () => {
			this.log("Database initialized!");
			this.db = openReq.result;

			if (this.opts.initEmpty) {
				await this.clearDB();
			}

			this.dbInitResolve!();
		}

		openReq.onupgradeneeded = async () => {
			this.db = openReq.result;

			for (const store of this.opts.stores) {
				if (this.ensureObjectStore(store.name, store.keyPath ?? null) === null) {
					this.warn("Failed to create object store!", { store: store.name });
					this.dbInitReject!();
				}
			}

			this.log("Database created!");
			this.dbInitResolve!();
		};
	}

	private initTransaction() {
		if (!this.db) return;

		this.transaction = this.db.transaction(this.db.objectStoreNames, "readwrite");

		this.transaction.oncomplete = () => {
			this.transaction = null;
		}
	}

	private ensureTransaction(obj: string): IDBTransaction {
		if (this.transaction === null) this.initTransaction();

		try {
			this.transaction?.objectStore(obj);
			return this.transaction!;
		} catch {
			return this.db!.transaction(obj, "readwrite");
		}
	}

	databaseInit() {
		return this.dbInitPromise;
	}

	protected log(msg: string, context: Record<string, string> = {}) {
		const parsedContext: Record<string, string> = { DB: this.opts.name, ...context };

		console.log(`${msg} (${logContextToMsg(parsedContext)})`);
	}

	protected warn(msg: string, context: Record<string, string> = {}) {
		const parsedContext: Record<string, string> = { DB: this.opts.name, ...context };

		console.warn(`${msg} (${logContextToMsg(parsedContext)})`);
	}

	// Returns true if a new store was created, false if the store exists, null if failed
	private async ensureObjectStore(name: string, keypath: string | null): Promise<boolean | null> {
		if (this.db === null) {
			this.warn("Attempt to ensure store before database initialization!", { store: name });
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

	private createStore(name: string, keyPath: string | null) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to create store before database initialization!", { store: name });
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

	protected async clearDB(): Promise<boolean> {
		if (this.db === null) {
			this.warn("Attempt to clear database before initialization!");
			return false;
		}

		for (const store of this.opts.stores) {
			try {
				await this.clearStore(store.name);
			} catch (err: any) {
				this.warn("Failed to clear store", { store: store.name, error: err });
				return false;
			}
		}

		return true;
	}

	protected write<T>(obj: string, key: string | null, val: T) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to write to database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.add(val, key ?? undefined);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			}
		});
	}

	protected update<T>(obj: string, key: string | null, val: T) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to write to database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.put(val, key ?? undefined);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			}
		});
	}

	protected read<T>(obj: string, key: string): Promise<T> {
		return new Promise<T>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to read database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.get(key);

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res(req.result as T);
			};
		});
	}

	protected async readAll<T>(obj: string): Promise<T[]> {
		return new Promise<T[]>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to read database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.getAll();

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res(req.result as T[]);
			};
		});
	}

	protected delete(obj: string, key: string): Promise<boolean> {
		return new Promise<boolean>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to delete from database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.delete(key);

			req.onerror = (ev) => {
				res(false);
			};

			req.onsuccess = (ev) => {
				res(true);
			};
		});
	}

	protected getKeys(obj: string): Promise<string[]> {
		return new Promise<string[]>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to read database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.getAllKeys();

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res(req.result as string[]);
			};
		});
	}

	protected async storeHasKey(store: string, key: string): Promise<boolean | null> {
		if (this.db === null) {
			this.warn("Attempt to read store before database initialization!", { store });
			return null;
		}

		const keys = await this.getKeys(store);
		return keys.includes(key);
	}

	protected clearStore(obj: string) {
		return new Promise<void>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to delete from database before initialization!", { store: obj });
				rej();
				return;
			}
	
			const objStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.clear();

			req.onerror = (ev) => {
				rej(req.error);
			};

			req.onsuccess = (ev) => {
				res();
			};
		});
	}

	// Returns an array with all entries specified by the "keys" arg
	protected async fillKeyArray<T>(obj: string, keys: string[]): Promise<T[]> {
		return Promise.all(keys.map((k) => this.read<T>(obj, k)));
	}

	private async find<T>(obj: string, predicate: (val: T) => boolean, single: boolean): Promise<T[]> {
		return new Promise<T[]>((res, rej) => {
			if (this.db === null) {
				this.warn("Attempt to delete from database before initialization!", { store: obj });
				rej();
				return;
			}

			const objStore: IDBObjectStore = this.ensureTransaction(obj).objectStore(obj);
			const req = objStore.openCursor();

			req.onerror = (ev) => {
				rej(req.error);
			};

			const output: T[] = [];

			req.onsuccess = (ev) => {
				const cursor = (ev.target as any).result as IDBCursorWithValue;

				if (cursor === null) {
					res(output);
					return;
				}

				const val = cursor.value as T;

				if (predicate(val)) {
					if (single) {
						res([ val ]);
						return;
					} else {
						output.push(val);
					}
				}

				cursor.continue();
			};
		});
	}

	protected async findMany<T>(obj: string, predicate: (val: T) => boolean): Promise<T[]> {
		return this.find<T>(obj, predicate, false);
	}

	protected async findOne<T>(obj: string, predicate: (val: T) => boolean): Promise<T | null> {
		const res = await this.find<T>(obj, predicate, true);
		return res.length === 0 ? null : res[0];
	}
}
