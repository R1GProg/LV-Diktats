<script lang="ts">
import type Action from "@shared/diff-engine/build/Action";
import type Mistake from "@shared/diff-engine/build/Mistake";

	import { createEventDispatcher } from "svelte";
	import { actionRegister } from "../ts/actionRegister";
	import type EssayBox from "./EssayBox.svelte";
	import InputPopup from "./InputPopup.svelte";

	export let diff: { char: Action[], words: Mistake[] } = { char: [], words: [] };
	export let essays: { check: EssayBox, correct: EssayBox, diff: EssayBox };
	let popup: InputPopup;
	let externalHoverId = "";
	const dispatcher = createEventDispatcher();

	export function onEssayErrorClick(id: string) {
		const action = diff.char.find((a) => a.id === id);

		if (!action) {
			console.warn(`Attempt to handle unknown action ID ${id}`);
			return;
		}

		onCharEntryClick(action);
	}

	function onWordEntryHover(word: Mistake) {
		// TODO: highlight word in diff
		// essays.diff.setTextActive(word.actions[0].indexCheck, word.word.length, 3);

		switch(word.type) {
			case "MIXED":
				essays.check.setTextActive(word.boundsCheck.start, word.boundsCheck.end - word.boundsCheck.start, 0);
				essays.correct.setTextActive(word.boundsCorrect.start, word.boundsCorrect.end - word.boundsCorrect.start, 0);
				break;
			case "ADD":
				essays.correct.setTextActive(word.boundsCorrect.start, word.boundsCorrect.end - word.boundsCorrect.start, 2);
				break;
			case "DEL":
				essays.check.setTextActive(word.boundsCheck.start, word.boundsCheck.end - word.boundsCheck.start, 1);
				break;
		}
	}

	function onCharEntryHover(action: Action) {
		essays.diff.setHighlightActive(action.id, true);

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

	export function externalEntryEnter(id: string) {
		externalHoverId = id;
	}

	export function externalEntryLeave() {
		externalHoverId = "";
	}

	async function onCharEntryClick(action: Action) {
		try {
			const desc = await popup.promptForValue({ title: "Kļūdas reģistrācija", text: "Kļūdas apraksts" });
			// actionRegister.addActionToRegister(action, desc);
			dispatcher("actionregister", { id: action.id });
		} catch {}
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
			<td>[{entry.boundsCheck?.start}, {entry.boundsCheck?.end}]</td>
			<td>[{entry.boundsCorrect?.start}, {entry.boundsCorrect?.end}]</td>
			<!-- <td>{entry.word}</td> -->
			<!-- {#if entry.type === "MIXED"}
				<td>{entry.wordCorrect}</td>
			{:else}
				<td></td>
			{/if} -->
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
		<!-- class:marked={entry.inRegister} -->
		<tr
			
			on:mouseenter={() => { onCharEntryHover(entry); }}
			on:mouseleave={onEntryHoverLeave}
			on:click={() => { onCharEntryClick(entry); }}
			class:external-hover={externalHoverId === entry.id}
		>
			<td>{entry.type}</td>
			<td>{entry.subtype}</td>
			<td>{entry?.mistake?.registerId}</td>
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

<InputPopup bind:this={popup}/>

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

			&:hover, &.external-hover {
				&:nth-child(odd) {
					background-color: rgba(50, 150, 235, 0.4);
				}

				&:nth-child(even) {
					background-color: #DADADA;
				}
			}
		}

		&.marked {
			background-color: rgb(15, 220, 110);
		}
	}

	th {
		font-weight: bold;
		font-family: "Open sans", sans-serif;
	}
</style>