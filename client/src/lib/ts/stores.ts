import type { Submission, SubmissionID, SubmissionPreview, UUID, Workspace, WorkspacePreview } from "@shared/api-types";
import { getContext, onMount, setContext } from "svelte";
import type { MistakeId } from "@shared/diff-engine";
import { get, readable, writable, derived, type Readable, type Writable } from "svelte/store";
import { ToolbarMode } from "./toolbar";
import MistakeSelection from "./MistakeSelection";
import WorkspaceController from "./controller/WorkspaceController";

export interface Stores {
	mode: Writable<ToolbarMode>,
	hideRegistered: Writable<boolean>,
	sort: Writable<SortMode>,
	hoveredMistake: Writable<MistakeId | null>,
	activeSubmissionID: Writable<SubmissionID | null>,
	activeWorkspaceData: Writable<WorkspacePreview | null>,
	workspace: Readable<Promise<Workspace | null> | null>,
	activeSubmission: Readable<Promise<Submission | null> | null>,
	selectedMistakes: Readable<MistakeSelection>,
	sortedSubmissions: Readable<SubmissionPreview[] | null>,
	workspaceController: Readable<Promise<WorkspaceController>>
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

	const activeWorkspaceData = writable<WorkspacePreview | null>(null);
	const activeSubmissionID = writable<SubmissionID | null>(null, (set) => {
		activeWorkspaceData.subscribe((newID: WorkspacePreview | null) => {
			if (newID === null) set(null);
		});
	});

	const workspace = readable<Promise<Workspace | null> | null>(null, (set) => {
		activeWorkspaceData.subscribe(async (newID: WorkspacePreview | null) => {
			if (newID === null) {
				set(null);
			} else {
				set((await get(workspaceController)).getWorkspace(newID));
			}
		});
	});

	const workspaceController = readable<Promise<WorkspaceController>>(new Promise((res) => {
		onMount(async () => {
			const controller = new WorkspaceController(workspace, activeSubmissionID);
			await controller.init();
			res(controller);
		});
	}));

	const activeSubmission = readable<Promise<Submission | null> | null>(null, (set) => {
		activeSubmissionID.subscribe(async (newID: string | null) => {
			if (newID === null || get(activeWorkspaceData) === null) {
				set(null);
			} else {
				const submission = (await get(workspaceController)).getSubmission(get(activeWorkspaceData)!, newID);
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

	const sortedSubmissions = derived<[Readable<Promise<Workspace | null> | null>, Readable<SortMode>], SubmissionPreview[] | null>(
		[workspace, sort],
		([$workspace, $sort], set) => {
			if ($workspace === null) {
				set(null);
				return;
			}

			$workspace.then((ws) => {
				if (ws === null) {
					set(null);
					return;
				}

				const submArr = Object.values(ws.submissions);
				
				if (ws.id === "debugworkspaceid") {
					for (const subm of submArr) {
						subm.mistakeCount = (subm as unknown as Submission).data.mistakes.length;
					}
				}

				switch ($sort) {
					case SortMode.ID:
						submArr.sort((a, b) => Number(a.id.substring(2)) - Number(b.id.substring(2)));
						break;
					case SortMode.MISTAKE:
						submArr.sort((a, b) => b.mistakeCount - a.mistakeCount);
						break;
				}

				set(submArr);
			});
	});

	setContext("stores", {
		mode,
		hideRegistered,
		sort,
		hoveredMistake,
		activeSubmissionID,
		activeWorkspaceData,
		workspace,
		activeSubmission,
		selectedMistakes,
		sortedSubmissions,
		workspaceController
	} as Stores);
}
