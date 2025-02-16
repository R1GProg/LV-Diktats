import type { Submission, SubmissionID, SubmissionPreview, UUID, Workspace } from "@shared/api-types";
import { getContext, onMount, setContext } from "svelte";
import type { MistakeId } from "@shared/diff-engine";
import { get, readable, writable, derived, type Readable, type Writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";
import WorkspaceCache from "./WorkspaceCache";
import { api } from "$lib/ts/networking/DiktifyAPI";
import DiktifySocket from "./networking/DiktifySocket";
import config from "$lib/config.json";
import MistakeSelection from "./MistakeSelection";
import LocalWorkspaceDatabase from "./LocalWorkspaceDatabase";
import { countRegisteredMistakes } from "./util";

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
	ds: Readable<DiktifySocket>,
	selectedMistakes: Readable<MistakeSelection>,
	localWorkspaceDatabase: Readable<Promise<LocalWorkspaceDatabase>>,
	sortedSubmissions: Readable<SubmissionPreview[] | null>,
	selectedMultiVariation: Writable<UUID | null>
}

export enum SortMode {
	MISTAKE,
	ID,
	UNREG_MISTAKE,
	STATE
}

export default function store(store: keyof Stores) {
	const ctx = getContext("stores") as Stores;

	return ctx[store];
}

// Incredibly hacky
let sortModeSetFunc: (val: SubmissionPreview[] | null) => void;
export async function reSort(ws: Workspace, sort: SortMode) {
	const submArr = Object.values(ws.submissions);
	
	if (ws.id === "debugworkspaceid") {
		for (const subm of submArr) {
			const submData = (subm as unknown as Submission).data;
			subm.mistakeCount = submData.mistakes.length;
			subm.regMistakeCount = countRegisteredMistakes(subm as unknown as Submission, ws.register);
			// const submMistakes = (subm as unknown as Submission).data.mistakes;
			// const rawMistakes = submMistakes.flatMap((m) => m.subtype === "MERGED" ? m.children : m);
			// subm.mistakeCount = rawMistakes.length;
		}
	}

	switch (sort) {
		case SortMode.ID:
			submArr.sort((a, b) => Number(a.id.substring(2)) - Number(b.id.substring(2)));
			break;
		case SortMode.MISTAKE:
			submArr.sort((a, b) => b.mistakeCount - a.mistakeCount);
			break;
		case SortMode.UNREG_MISTAKE:
			submArr.sort((a, b) => b.mistakeCount - a.mistakeCount); // Make sure it's mistake count ordered, if equal unregistered count
			submArr.sort((a, b) => (b.mistakeCount - b.regMistakeCount!) - (a.mistakeCount - a.regMistakeCount!));
			break;
		case SortMode.STATE:
			submArr.sort((a, b) => a.state.localeCompare(b.state));
			break;
	}
	
	sortModeSetFunc(submArr);
}

export function initStores() {
	const mode = writable<ToolbarMode>(ToolbarMode.READ);
	const hideRegistered = writable<boolean>(false);
	const sort = writable<SortMode>(SortMode.MISTAKE);
	const hoveredMistake = writable<MistakeId | null>(null);

	const activeWorkspaceID = writable<UUID | null>(null);
	const activeSubmissionID = writable<SubmissionID | null>(null, (set) => {
		activeWorkspaceID.subscribe((newID: UUID | null) => {
			if (newID === null) set(null);
		});
	});

	const workspace = readable<Promise<Workspace> | null>(null, (set) => {
		activeWorkspaceID.subscribe((newID: UUID | null) => {
			if (newID === null) {
				set(null);
			} else {
				set(api.getWorkspace(newID, localWorkspaceDatabase));
			}
		});
	});

	const localWorkspaceDatabase = readable<Promise<LocalWorkspaceDatabase>>(new Promise<LocalWorkspaceDatabase>((res) => {
		onMount(async () => {
			const db = new LocalWorkspaceDatabase(workspace);
			await db.databaseInit();
			res(db);
		});
	}));

	const ds = readable<DiktifySocket>(new DiktifySocket(config.socketUrl, workspace, activeSubmissionID, localWorkspaceDatabase, sort))

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

	const selectedMistakes = readable<MistakeSelection>(new MistakeSelection(), (set) => {
		const sel = new MistakeSelection(() => {
			set(sel);
		});

		set(sel);
	});

	const sortedSubmissions = derived<[Stores["workspace"], Stores["sort"]], SubmissionPreview[] | null>(
		[workspace, sort],
		([$workspace, $sort], set) => {
			sortModeSetFunc = set;

			if ($workspace === null) {
				set(null);
				return;
			}

			$workspace.then((ws) => {
				const submArr = Object.values(ws.submissions);

				if (ws.id === "debugworkspaceid") {
					for (const subm of submArr) {
						const submData = (subm as unknown as Submission).data;
						subm.mistakeCount = submData.mistakes.length;
						subm.regMistakeCount = countRegisteredMistakes(subm as unknown as Submission, ws.register);
						// const submMistakes = (subm as unknown as Submission).data.mistakes;
						// const rawMistakes = submMistakes.flatMap((m) => m.subtype === "MERGED" ? m.children : m);
						// subm.mistakeCount = rawMistakes.length;
					}
				}

				switch ($sort) {
					case SortMode.ID:
						submArr.sort((a, b) => Number(a.id.substring(2)) - Number(b.id.substring(2)));
						break;
					case SortMode.MISTAKE:
						submArr.sort((a, b) => b.mistakeCount - a.mistakeCount);
						break;
					case SortMode.UNREG_MISTAKE:
						submArr.sort((a, b) => b.mistakeCount - a.mistakeCount); // Make sure it's mistake count ordered, if equal unregistered count
						submArr.sort((a, b) => (b.mistakeCount - b.regMistakeCount!) - (a.mistakeCount - a.regMistakeCount!));
						break;
					case SortMode.STATE:
						submArr.sort((a, b) => a.state.localeCompare(b.state));
						break;
				}

				set(submArr);
			});
	});

	const selectedMultiVariation = writable<UUID | null>(null);

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
		ds,
		selectedMistakes,
		localWorkspaceDatabase,
		sortedSubmissions,
		selectedMultiVariation
	} as Stores);
}
