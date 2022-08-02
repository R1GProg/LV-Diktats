<script lang="ts">
	import { onMount, createEventDispatcher } from "svelte";
	import { parseCSV } from "../ts/csv";
	import type { EssayEntry } from "../types";

	const dispatch = createEventDispatcher();

	let files: FileList;
	let entries: Record<string, EssayEntry> = {
		"1": {id: "1", text: "Hello world1!"},
		"2": {id: "2", text: "Hello world2!"},
		"3": {id: "3", text: "Hello world3!"},
		"4": {id: "4", text: "Hello world4!"},
		"5": {id: "5", text: "Hello world5!"},
	};

	$: if (files) parseCSV(files[0]);

	function onSelect(id: string) {
		dispatch("select", { entry: entries[id] })
	}
</script>

<div class="container">
	<div class="fileselect">
		<h2>Izvēlēties CSV</h2>
		<input type="file" bind:files={files}>
	</div>

	<div class="entryContainer">
		{#each Object.values(entries) as entry}
		<div class="entry" data-id={entry.id} on:click={() => { onSelect(entry.id); }}>
			<span class="entry-title">{entry.id}</span>
		</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.container {
		display: grid;
		grid-template-areas: "select" "entries";
		grid-template-rows: 10% 80%;
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
	}
</style>