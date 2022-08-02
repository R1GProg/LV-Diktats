<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { parseCSV } from "../ts/csv";
	import { processString } from "../ts/normalization";
	import type { EssayEntry } from "../types";

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

	function onSelect(id: string) {
		activeID = id;
		dispatch("select", { entry: entries[id] })
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
	<div class="fileselect">
		<h2>Izvēlēties CSV</h2>
		<input type="file" bind:files={files}>
	</div>

	<div class="nav">
		<button on:click={() => {changeSelectionBy(-1)}}>Iepriekšējais</button>
		<button on:click={() => {changeSelectionBy(1)}}>Nākamais</button>
	</div>

	<div class="entryContainer">
		{#each Object.values(entries) as entry}
		<div
			class="entry"
			class:active={activeID === entry.id}
			data-id={entry.id}
			on:click={() => { onSelect(entry.id); }}
		>
			<span class="entry-title">{entry.id}</span>
		</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.container {
		display: grid;
		grid-template-areas: "select" "nav" "entries";
		grid-template-rows: 10% 5% 80%;
		row-gap: 10px;
		padding: 10px;
		height: calc(100% - 20px);
	}

	.fileselect {
		grid-area: select;
		border: 1px solid black;
		height: 100%;
		padding-left: 10px;
	}

	.fileselect h2 {
		margin: 0.35em 0;
	}

	.nav {
		grid-area: nav;

		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 10px;

		button {
			width: 100%;
			cursor: pointer;
		}
	}

	.entryContainer {
		grid-area: entries;
		border: 1px solid black;
		display: flex;
		flex-direction: column;
		padding: 10px;
		row-gap: 10px;
		overflow-y: auto;
		overflow-x: hidden;
		height: 100%;
	}

	.entry {
		width: 100%;
		height: 2rem;
		border: 1px solid black;
		font-family: "Open sans", sans-serif;
		font-size: 1.5rem;
		
		cursor: pointer;
		transition: filter 0.3s;

		background-color: rgba(30, 125, 215, 0.25);

		display: flex;
		justify-content: center;
		align-items: center;

		&:hover {
			filter: brightness(50%);
		}

		&.active {
			background-color: rgba(30, 175, 30, 0.25);
		}
	}
</style>