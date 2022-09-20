<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import store, { SortMode, type Stores } from "$lib/ts/stores";
	import config from "$lib/config.json";
	import { processString } from "@shared/normalization";
	import SubmissionModal from "./modals/SubmissionModal.svelte";
	import type { SubmissionID } from "@shared/api-types";

	const workspace = store("workspace") as Stores["workspace"];
	const sort = store("sort") as Stores["sort"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];

	const dispatch = createEventDispatcher();

	let activeID = "";
	let activeIndex = 0;
	let totalEntries = 0;
	let noData = true;
	let submissionModal: SubmissionModal;
	let mistakeOrderMap: string[];
	let activeWorkspaceKey: string;

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
		activeID = id;
		$activeSubmissionID = id;

		// if (!$workspace.local && $workspace.submissions[id].text === null) {
		// 	const req = await fetch(`${config.endpointUrl}/api/getSubmission?id=${id}`);
		// 	const data = await req.text();

		// 	$workspace.submissions[id] = {
		// 		id,
		// 		text: processString(data),
		// 		ignoredText: [],
		// 	};

		// 	dispatch("select", { entry: id });
		// } else {
		// 	dispatch("select", { entry: id });
		// }

		dispatch("select", { entry: id });
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

		noData = false;
		const keys = Object.keys(ws.submissions);

		mistakeOrderMap = keys;
		mistakeOrderMap.sort((a, b) => ws.submissions[b].data!.mistakes.length - ws!.submissions[a].data!.mistakes.length);

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

	onMount(() => {
		// A quick and dirty hack
		// setTimeout(() => {
		// 	initWorkspace();
		// }, 500);
	});

	function onSortChange() {
		// initWorkspace();
	}
</script>

<div class="container">
	<h2 class="mainid">{noData ? "Nav datu" : `ID${activeID}`}</h2>
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
		grid-template-areas: "id" "selector" "openall";
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
</style>