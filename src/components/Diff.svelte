<script lang="ts">
	import type { Action, Word } from "../ts/diff";
	import type EssayBox from "./EssayBox.svelte";

	export let diff: { char: Action[], words: Word[] } = { char: [], words: [] };
	export let essays: { check: EssayBox, correct: EssayBox, diff: EssayBox };

	function onWordEntryHover(word: Word) {
		// TODO: highlight word in diff
		// essays.diff.setTextActive(word.actions[0].indexCheck, word.word.length, 3);

		switch(word.type) {
			case "ERR":
				essays.check.setTextActive(word.boundsCheck[0], word.word.length, 0);
				essays.correct.setTextActive(word.boundsCorrect[0], word.wordCorrect.length, 0);
				break;
			case "ADD":
				essays.correct.setTextActive(word.boundsCorrect[0], word.word.length, 2);
				break;
			case "DEL":
				essays.check.setTextActive(word.boundsCheck[0], word.word.length, 1);
				break;
		}
	}

	function onCharEntryHover(action: Action) {
		essays.diff.setHighlightActive(action.id);

		switch (action.type) {
			case "ADD":
				essays.correct.setTextActive(action.indexCorrect, 1, 2);
				break;
			case "DEL":
				essays.check.setTextActive(action.indexCheck, action.char.length, 1);
				break;
			case "SUB":
				essays.correct.setTextActive(action.indexCorrect, 1, 0);
				essays.check.setTextActive(action.indexCheck, action.charBefore.length, 0);
				break;
		}		
	}

	function onEntryHoverLeave() {
		essays.diff.clearAllActiveHighlights();
		essays.check.clearAllActiveHighlights(true);
		essays.correct.clearAllActiveHighlights(true);
	}
</script>

<div class="container">
	<table>
		<tr class="headRow">
			<th>Index</th>
			<th>Type</th>
			<th>Bounds Check</th>
			<th>Bounds Correct</th>
			<th>Word</th>
			<th>Correct word</th>
		</tr>
		{#each diff.words as entry, i}
		<tr on:mouseenter={() => { onWordEntryHover(entry); }} on:mouseleave={onEntryHoverLeave}>
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
		<tr class="headRow">
			<th>Type</th>
			<th>Subtype</th>
			<th>Word index</th>
			<th>Index correct</th>
			<th>Index check</th>
			<th>Index diff</th>
			<th>Characters</th>
		</tr>
		{#each diff.char as entry}
		<tr on:mouseenter={() => { onCharEntryHover(entry); }} on:mouseleave={onEntryHoverLeave}>
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

		&:not(.headRow) {
			transition: background-color 0.5s;
			cursor: pointer;

			&:hover {
				&:nth-child(odd) {
					background-color: rgba(50, 150, 235, 0.4);
				}

				&:nth-child(even) {
					background-color: #DADADA;
				}
			}
		}
	}

	th {
		font-weight: bold;
		font-family: "Open sans", sans-serif;
	}
</style>