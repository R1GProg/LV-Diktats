<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import SubmissionModal from "./modals/SubmissionModal.svelte";
	import type { SubmissionID, SubmissionState } from "@shared/api-types";
	import type { MistakeId } from "@shared/diff-engine";
	import config from "$lib/config.json";
	import { exportSubmission } from "$lib/ts/SubmissionExport";

	const workspace = store("workspace") as Stores["workspace"];
	const sort = store("sort") as Stores["sort"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const ds = store("ds") as Stores["ds"];
	const sortedSubmissions = store("sortedSubmissions") as Stores["sortedSubmissions"];

	let activeIndex = 0;
	let submissionModal: SubmissionModal;

	let submissionState: SubmissionState | null = null;
	$: (async () => {
		submissionState = (await $activeSubmission)?.state ?? null;
	})();

	function selectID(id: MistakeId) {
		if ($sortedSubmissions === null) return;

		selectIndex($sortedSubmissions.findIndex((s) => s.id === id));
	}

	async function selectIndex(index: number) {
		if ($sortedSubmissions === null) return;

		activeIndex = index;
		$activeSubmissionID = $sortedSubmissions[index].id;
	}

	export async function getNextUngradedIndex(direction: number, minDelta: number = 0): Promise<number | null> {
		if ($sortedSubmissions === null) return null;

		const searchArr = $sortedSubmissions.map((s) => s.id);

		if (direction < 0) {
			const revArr = [...searchArr].reverse();
			const revActiveIndex = searchArr.length - activeIndex - 1;
			const index = revArr.findIndex((id, i) => (
				$sortedSubmissions![i].state === "UNGRADED"
				&& i >= revActiveIndex - minDelta
				&& id !== $activeSubmissionID
			));

			return index === -1 ? null : searchArr.length - index - 1;
		} else {
			const index = searchArr.findIndex((id, i) => (
				i >= activeIndex + minDelta
				&& $sortedSubmissions![i].state === "UNGRADED"
			));

			return index ?? -1;
		}
	}

	export async function changeSelectionBy(delta: number) {
		const ws = await $workspace;
		if (ws === null) return;

		selectIndex((await getNextUngradedIndex(Math.sign(delta), delta))!);
	}

	function onEntryOpen(ev: CustomEvent) {
		const id = ev.detail.id as string;
		selectID(id);
	}

	async function initWorkspace() {
		let nextIndex: number | null;
		const savedID = localStorage.getItem("activeSubmissionID");

		if (config.persistentActiveSubmission && savedID) {
			activeIndex = $sortedSubmissions!.findIndex((s) => s.id === savedID);
			nextIndex = activeIndex;
		} else {
			activeIndex = 0;
			nextIndex = await getNextUngradedIndex(0);
		}

		if (nextIndex === null) return;

		activeIndex = nextIndex;
		selectIndex(activeIndex);
	}
	
	function onSortChange() {
		if (config.persistentActiveSubmission) {
			localStorage.setItem("sortMode", $sort.toString());
		}

		initWorkspace();
	}

	function onSubmissionStateClick(newState: SubmissionState) {
		if ($activeSubmissionID === null || $activeWorkspaceID === null) return;

		submissionState = submissionState === newState ? null : newState;

		$ds.submissionStateChange(newState, $activeSubmissionID, $activeWorkspaceID);
	}

	async function onActiveSubmissionChange(id: SubmissionID | null) {
		if (!config.persistentActiveSubmission) return;
		
		if (id !== null) {
			localStorage.setItem("activeSubmissionID", id);
		}
	}

	$: if ($activeWorkspaceID !== null && $sortedSubmissions !== null) initWorkspace();
	$: if ($sortedSubmissions !== null) onSortChange();
	$: if ($workspace) onActiveSubmissionChange($activeSubmissionID);
</script>

<div class="container">
	<h2 class="mainid">{$activeWorkspaceID ? `ID${$activeSubmissionID}` : `Nav datu`}</h2>
	<div class="status-container">
		<button
			class="status-rejected"
			class:active={submissionState === "REJECTED"}
			disabled={$activeWorkspaceID === null}
			on:click={() => { onSubmissionStateClick("REJECTED") }}
		>Nelabos</button>
		<button
			class="status-done"
			class:active={submissionState === "DONE"}
			disabled={$activeWorkspaceID === null}
			on:click={() => { onSubmissionStateClick("DONE") }}
		>Izlabots</button>
	</div>
	{#if $activeWorkspaceID !== null}
	<div class="selector">
		<button class="prev" on:click={() => { changeSelectionBy(-1) }}></button>
		<span>{activeIndex + 1}/{$sortedSubmissions?.length}</span>
		<button class="next" on:click={() => { changeSelectionBy(1) }}></button>
	</div>
	<button class="openall" on:click={() => { submissionModal.open(); }}>Apskatīt visus</button>
	{/if}
</div>

<SubmissionModal bind:this={submissionModal} on:open={onEntryOpen}/>

<style lang="scss">
	@import "../scss/global.scss";

	.container {
		display: grid;
		grid-template-areas: "id" "status" "selector" "openall";
		justify-content: center;
		row-gap: 1vh;
		margin-bottom: 1.5vh;
	}

	.mainid {
		grid-area: id;
		font-family: $FONT_HEADING;
		font-size: 3rem;
		font-weight: 400;
		color: $COL_FG_REG;
		margin: 0;
		text-align: center;
	}

	.selector {
		grid-area: selector;
		display: grid;
		align-items: center;
		width: $INFO_WIDTH;
		grid-template-columns: 1fr auto 1fr;

		span {
			font-family: $FONT_HEADING;
			font-size: 1.5rem;
			color: $COL_FG_REG;
			display: inline-block;
		}
		
		button {
			@include button_icon(true);

			justify-self: center;

			$WIDTH: 2vw;
			width: $WIDTH;
			height: calc(#{$WIDTH} * 0.66);
			
			&.prev {
				-webkit-mask-image: url(/icons/icon-prev.svg);
				mask-image: url(/icons/icon-prev.svg);
				
				-webkit-mask-size: 95%;
				mask-size: 95%;
			}
			
			&.next {
				-webkit-mask-image: url(/icons/icon-next.svg);
				mask-image: url(/icons/icon-next.svg);
				
				-webkit-mask-size: 95%;
				mask-size: 95%;
			}
		}
	}

	.openall {
		grid-area: openall;
		background-color: transparent;
		border: none;
		font-family: $FONT_HEADING;

		font-size: 1.5rem;
		color: $COL_FG_DARK;

		@include hover_filter;
	}

	.status-container {
		grid-area: status;
		width: 100%;

		display: grid;
		grid-template-columns: 1fr 1fr;

		margin-bottom: 1vh;

		button {
			background-color: $COL_BG_DARK;
			border: none;
			border-top: 1px solid $COL_ACCENT;
			border-bottom: 1px solid $COL_ACCENT;

			font-family: $FONT_HEADING;
			color: $COL_BG_LIGHT;
			font-size: 1.5rem;
			cursor: pointer;
			transition: background-color 0.3s, color 0.3s;

			&:not([disabled]):not(.active):hover {
				background-color: $COL_BG_REG;

				&.status-rejected {
					color: $COL_SUBM_REJECTED_DARK;
				}

				&.status-done {
					color: $COL_SUBM_DONE_DARK;
				}
			}

			&.active {
				background-color: $COL_BG_REG;

				&.status-rejected {
					color: $COL_SUBM_REJECTED;
				}

				&.status-done {
					color: $COL_SUBM_DONE;
				}
			}

			&:first-child {
				border-right: 1px solid $COL_ACCENT;
			}

			&[disabled] {
				visibility: hidden;
			}
		}
	}
</style>