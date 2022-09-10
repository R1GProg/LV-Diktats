<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { workspace, sort, SortMode } from "$lib/ts/stores";
	import config from "$lib/config.json";
	import { processString } from "@shared/normalization";
	import SubmissionModal from "./modals/SubmissionModal.svelte";

	const dispatch = createEventDispatcher();

	let activeID = "";
	let activeIndex = 0;
	let totalEntries = 0;
	let noData = true;
	let submissionModal: SubmissionModal;
	let mistakeOrderMap: string[];

	// async function fetchData() {
	// 	const raw = await fetch(config.endpointUrl + "/api/listSubmissions", {
	// 		mode: "cors",
	// 		method: "GET"
	// 	});

	// 	const result: number[] = await raw.json();

	// 	result.forEach((x) => {
	// 		entries[x.toString()] = {
	// 			id: x.toString(),
	// 			text: null
	// 		}
	// 	});
	// }

	async function onSelect(index: number | string) {
		if ($workspace === null) return;

		let id: string;
		let setIndex: number;

		if (typeof index === "number") {
			if ($sort === SortMode.ID) {
				const keys = Object.keys($workspace.dataset);
				id = keys[index];
			} else {
				id = mistakeOrderMap[index];
			}

			setIndex = index;
		} else {
			id = index;
			setIndex = Object.keys($workspace.dataset).findIndex((el) => el === id);
		}

		if (!$workspace.dataset[id]) return;

		activeIndex = setIndex;
		activeID = id;

		if (!$workspace.local && $workspace.dataset[id].text === null) {
			const req = await fetch(`${config.endpointUrl}/api/getSubmission?id=${id}`);
			const data = await req.text();

			$workspace.dataset[id] = {
				id,
				text: processString(data),
				ignoredText: [],
			};

			dispatch("select", { entry: id });
		} else {
			dispatch("select", { entry: id });
		}
	}

	export function changeSelectionBy(delta: number) {
		if ($workspace === null) return;

		onSelect(activeIndex + delta);
	}

	function onEntryOpen(ev: CustomEvent) {
		const id = ev.detail.id as string;
		onSelect(id);
	}

	function initWorkspace() {
		if ($workspace === null) return;

		noData = false;
		const keys = Object.keys($workspace.dataset);

		mistakeOrderMap = keys;
		mistakeOrderMap.sort((a, b) => $workspace!.dataset[b].mistakes!.length - $workspace!.dataset[a].mistakes!.length);

		totalEntries = keys.length;
		activeIndex = 0;
		onSelect(0);
	}

	$: if ($workspace) {
		initWorkspace();
	} else if ($workspace === null) {
		noData = true;
	}

	onMount(() => {
		// A quick and dirty hack
		setTimeout(() => {
			initWorkspace();
		}, 500);
	});

	function onSortChange() {
		initWorkspace();
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