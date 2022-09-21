<script lang="ts">
	import store, { SortMode, type Stores } from "$lib/ts/stores";
	import SubmissionModal from "./modals/SubmissionModal.svelte";
	import type { Submission, SubmissionID, SubmissionState } from "@shared/api-types";

	const workspace = store("workspace") as Stores["workspace"];
	const sort = store("sort") as Stores["sort"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const ds = store("ds") as Stores["ds"];

	let activeIndex = 0;
	let totalEntries = 0;
	let noData = true;
	let submissionModal: SubmissionModal;
	let mistakeOrderMap: string[];
	let activeWorkspaceKey: string;

	let submissionState: SubmissionState | null = null;
	$: (async () => {
		submissionState = (await $activeSubmission)?.state ?? null;
	})();

	async function onSelect(index: number | SubmissionID) {
		if ($workspace === null) return;

		const ws = await $workspace;
		let id: string;
		let setIndex: number;

		if (typeof index === "number") {
			if ($sort === SortMode.ID) {
				const keys = Object.keys(ws.submissions);
				id = keys[index];
			} else {
				id = mistakeOrderMap[index];
			}

			setIndex = index;
		} else {
			id = index;
			setIndex = Object.keys(ws.submissions).findIndex((el) => el === id);
		}

		if (!ws.submissions[id]) return;

		activeIndex = setIndex;
		$activeSubmissionID = id;
	}

	export function changeSelectionBy(delta: number) {
		if ($workspace === null) return;

		onSelect(activeIndex + delta);
	}

	function onEntryOpen(ev: CustomEvent) {
		const id = ev.detail.id as string;
		onSelect(id);
	}

	async function initWorkspace() {
		if ($workspace === null) return;

		const ws = await $workspace;
		const submissions = ws.submissions as Record<SubmissionID, Submission>;

		noData = false;
		const keys = Object.keys(submissions);

		mistakeOrderMap = keys;
		mistakeOrderMap.sort((a, b) => submissions[b].data.mistakes.length - submissions[a].data.mistakes.length);

		totalEntries = keys.length;
		activeIndex = 0;
		onSelect(0);

		activeWorkspaceKey = ws.id;
	}

	$: if ($activeWorkspaceID !== activeWorkspaceKey) {
		initWorkspace();
	} else if ($workspace === null) {
		noData = true;
	}

	function onSortChange() {
		initWorkspace();
	}

	function onSubmissionStateClick(newState: SubmissionState) {
		if ($activeSubmissionID === null || $activeWorkspaceID === null) return;

		submissionState = newState;

		$ds.submissionStateChange(newState, $activeSubmissionID, $activeWorkspaceID);
	}
</script>

<div class="container">
	<h2 class="mainid">{noData ? "Nav datu" : `ID${$activeSubmissionID}`}</h2>
	<div class="status-container">
		<button
			class="status-rejected"
			class:active={submissionState === "REJECTED"}
			disabled={noData}
			on:click={() => { onSubmissionStateClick("REJECTED") }}
		>Nelabos</button>
		<button
			class="status-done"
			class:active={submissionState === "DONE"}
			disabled={noData}
			on:click={() => { onSubmissionStateClick("DONE") }}
		>Izlabots</button>
	</div>
	{#if !noData}
	<div class="selector">
		<button class="prev" on:click={() => { changeSelectionBy(-1) }}></button>
		<span>{activeIndex + 1}/{totalEntries}</span>
		<button class="next" on:click={() => { changeSelectionBy(1) }}></button>
	</div>
	<button class="openall" on:click={() => { submissionModal.open(); }}>Apskatīt visus</button>
	{/if}
</div>

<SubmissionModal bind:this={submissionModal} on:open={onEntryOpen} on:sortchange={onSortChange}/>

<style lang="scss">
	@import "../scss/global.scss";

	.container {
		display: grid;
		grid-template-areas: "id" "status" "selector" "openall";
		justify-content: center;
		row-gap: 1.5vh;
		margin-bottom: 3vh;
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
					color: rgb(75, 15, 15);
				}

				&.status-done {
					color: rgb(15, 75, 15);
				}
			}

			&.active {
				cursor: default;
				background-color: $COL_BG_REG;

				&.status-rejected {
					color: rgb(150, 50, 50);
				}

				&.status-done {
					color: rgb(30, 140, 30);
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