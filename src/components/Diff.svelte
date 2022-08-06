<script lang="ts">
	import type { Action, Word } from "../ts/diff";

	export let diff: { char: Action[], words: Word[] } = { char: [], words: [] };
</script>

<div class="container">
	<table>
		<tr>
			<th>Index</th>
			<th>Type</th>
			<th>Bounds Check</th>
			<th>Bounds Correct</th>
			<th>Word</th>
			<th>Correct word</th>
		</tr>
		{#each diff.words as entry, i}
		<tr>
			<td>{i}</td>
			<td>{entry.type}</td>
			{#if entry.boundsCheck}
				<td>{entry.boundsCheck}</td>
				<td></td>
			{:else}
				<td></td>
				<td>{entry.boundsCorrect}</td>
			{/if}
			<td>{entry.word}</td>
			{#if entry.type === "ERR"}
				<td>{entry.wordCorrect}</td>
			{:else}
				<td></td>
			{/if}
		</tr>
		{/each}
	</table>

	<table>
		<tr>
			<th>Type</th>
			<th>Subtype</th>
			<th>Word index</th>
			<th>Index correct</th>
			<th>Index check</th>
			<th>Index diff</th>
			<th>Characters</th>
		</tr>
		{#each diff.char as entry}
		<tr>
			<td>{entry.type}</td>
			<td>{entry.subtype}</td>
			<td>{entry.subtype === "ORTHO" ? entry.wordIndex : ""}</td>
			<td>{entry.indexCorrect}</td>
			<td>{entry.indexCheck}</td>
			<td>{entry.indexDiff !== undefined ? entry.indexDiff : ""}</td>
			{#if entry.type !== "SUB"}
			<td>{entry.char}</td>
			{:else}
			<td>No {JSON.stringify(entry.charBefore)} uz {JSON.stringify(entry.char)}</td>
			{/if}
		</tr>
		{/each}
	</table>
</div>

<style lang="scss">
	.container {
		overflow-y: auto;
	}

	table {
		width: 100%;
		text-align: center;
	}

	tr {
		&:nth-child(odd) {
			background-color: rgba(50, 150, 235, 0.25);
		}
	}

	th {
		font-weight: bold;
		font-family: "Open sans", sans-serif;
	}
</style>