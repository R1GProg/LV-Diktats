<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { parseCSV } from "$lib/ts/csv";
	import { processString } from "@shared/normalization";
	import config from "$lib/config.json";
	import type { EssayEntry } from "$lib/types";

	const dispatch = createEventDispatcher();

	let files: FileList;
	let entries: Record<string, EssayEntry> = {};
	let activeID = "";

	$: if (files) parseCSV(files[0], (result) => {
		const id = result.data.id as string;

		if (!id) return;

		entries[id] = {
			id,
			text: processString(result.data.message),
		};
	});

	onMount(async () => {
		console.log(config.endpointUrl + "/api/listSubmissions");
		let raw = await fetch(config.endpointUrl + "/api/listSubmissions", {
			mode: "cors",
			method: "GET"
		});
		let result: number[] = await raw.json();
		result.forEach((x) => {
			entries[x.toString()] = {
				id: x.toString(),
				text: null
			}
		});
	});

	function onSelect(id: string) {
		activeID = id;
		if(entries[id].text === null) {
			fetch(config.endpointUrl + "/api/getSubmission?id=" + id, {
				method: "GET"
			}).then((data) => data.text()).then((result: string) => {
				entries[id] = {
					id,
					text: processString(result)
				}
				dispatch("select", { entry: entries[id] });
			});
		} else {
			dispatch("select", { entry: entries[id] });
		}
	}

	export function changeSelectionBy(delta: number) {
		const keys = Object.keys(entries);
		const activeIndex = keys.findIndex((v) => v === activeID);
		const nextIndex = keys[activeIndex + delta];

		if (entries[nextIndex]) {
			onSelect(entries[nextIndex].id);
		}
	}
</script>

<div class="container">
	<h2 class="mainid">ID1234</h2>
	<div class="selector">
		<button class="prev"></button>
		<span>1234/5678</span>
		<button class="next"></button>
	</div>
	<button class="openall">Apskatīt visus</button>
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