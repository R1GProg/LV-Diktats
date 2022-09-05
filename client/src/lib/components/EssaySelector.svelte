<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { workspace } from "$lib/ts/stores";
	import config from "$lib/config.json";
	import { processString } from "@shared/normalization";

	const dispatch = createEventDispatcher();

	let activeID = "";
	let activeIndex = 0;
	let totalEntries = 0;
	let noData = true;

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

	async function onSelect(id: string) {
		if ($workspace === null) return;

		activeID = id;

		if (!$workspace.local && $workspace.dataset[id].text === null) {
			const req = await fetch(`${config.endpointUrl}/api/getSubmission?id=${id}`);
			const data = await req.text();

			$workspace.dataset[id] = {
				id,
				text: processString(data)
			};

			dispatch("select", { entry: id });
		} else {
			dispatch("select", { entry: id });
		}
	}

	export function changeSelectionBy(delta: number) {
		if ($workspace === null) return;

		const keys = Object.keys($workspace.dataset);
		const nextIndex = keys[activeIndex + delta];

		if ($workspace.dataset[nextIndex]) {
			activeIndex += delta;
			onSelect($workspace.dataset[nextIndex].id);
		}
	}

	$: if ($workspace) {
		noData = false;
		const keys = Object.keys($workspace.dataset);
		totalEntries = keys.length;
		activeIndex = 1761;
		onSelect(keys[0]);
	} else if ($workspace === null) {
		noData = true;
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
	<button class="openall">Apskatīt visus</button>
	{/if}
</div>

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