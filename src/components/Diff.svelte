<script lang="ts">
	import type { Action } from "../ts/diff";

	export let diff: Action[] = [];
</script>

<div class="container">
	<table>
		<tr>
			<th>Type</th>
			<th>Index correct</th>
			<th>Index check</th>
			<th>Index diff</th>
			<th>Characters</th>
		</tr>
		{#each diff as entry}
		<tr>
			<td>{entry.type}</td>
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