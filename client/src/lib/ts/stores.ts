import type { Submission, SubmissionID, UUID, Workspace } from "@shared/api-types";
import { getContext, onMount, setContext } from "svelte";
import type { MistakeId } from "@shared/diff-engine";
import { get, readable, writable, type Readable, type Writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";
import WorkspaceCache from "./WorkspaceCache";
import { api } from "$lib/ts/networking/DiktifyAPI";
import DiktifySocket from "./networking/DiktifySocket";
import config from "$lib/config.json";

export interface Stores {
	mode: Writable<ToolbarMode>,
	hideRegistered: Writable<boolean>,
	sort: Writable<SortMode>,
	hoveredMistake: Writable<MistakeId | null>,
	activeSubmissionID: Writable<SubmissionID | null>,
	activeWorkspaceID: Writable<UUID | null>,
	cache: Readable<Promise<WorkspaceCache>>,
	workspace: Readable<Promise<Workspace> | null>,
	activeSubmission: Readable<Promise<Submission | null> | null>,
	ds: Readable<DiktifySocket>
}

export enum SortMode {
	MISTAKE,
	ID
}

export default function store(store: keyof Stores) {
	const ctx = getContext("stores") as Stores;

	return ctx[store];
}

export function initStores() {
	const mode = writable<ToolbarMode>(ToolbarMode.READ);
	const hideRegistered = writable<boolean>(false);
	const sort = writable<SortMode>(SortMode.MISTAKE);
	const hoveredMistake = writable<MistakeId | null>(null);

	const activeSubmissionID = writable<SubmissionID | null>(null);
	const activeWorkspaceID = writable<UUID | null>(null);

	const workspace = readable<Promise<Workspace> | null>(null, (set) => {
		activeWorkspaceID.subscribe((newID: UUID | null) => {
			if (newID === null) {
				set(null);
			} else {
				set(api.getWorkspace(newID));
			}
		});
	});

	const ds = readable<DiktifySocket>(new DiktifySocket(config.socketUrl, workspace))

	const cache = readable<Promise<WorkspaceCache>>(new Promise<WorkspaceCache>((res) => {
		onMount(async () => {
			const wsCache = new WorkspaceCache(get(ds));
			get(ds).cache = wsCache;
			await wsCache.databaseInit();
			res(wsCache);
		});
	}));

	const activeSubmission = readable<Promise<Submission | null> | null>(null, (set) => {
		activeSubmissionID.subscribe(async (newID: string | null) => {
			if (newID === null || get(activeWorkspaceID) === null) {
				set(null);
			} else {
				const submission = (await get(cache)).getSubmission(newID, get(activeWorkspaceID)!);
				set(submission);
			}
		});
	});

	setContext("stores", {
		mode,
		hideRegistered,
		sort,
		hoveredMistake,
		activeSubmissionID,
		activeWorkspaceID,
		cache,
		workspace,
		activeSubmission,
		ds
	} as Stores);
}
