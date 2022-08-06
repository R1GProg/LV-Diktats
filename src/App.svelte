<script lang="ts">
	import EssayBox from "./components/EssayBox.svelte";
	import EssaySelector from "./components/EssaySelector.svelte";
	import Diff from "./components/Diff.svelte";
	import { onMount } from "svelte";
	import type { EssayEntry } from "./types";
	import { Action, Diff_ONP, Word } from "./ts/diff";
	import { processString } from "./ts/normalization";

	let correctText = "";
	let checkText = "";
	let checkID = "";
	let activeDiff: { char: Action[], words: Word[] } = { char: [], words: [] };
	let checkEssayBox: EssayBox;
	let editableCheckEssayBox: EssayBox;
	let correctEssayBox: EssayBox;
	
	function onSelect(e: CustomEvent) {
		const entry = e.detail.entry as EssayEntry;
		checkText = entry.text;
		checkID = entry.id;

		const diff = new Diff_ONP(checkText, correctText);
		diff.calc();
		activeDiff.char = diff.getSequence();
		activeDiff.words = diff.getWords();

		checkEssayBox.set(checkText, activeDiff.char);
	}

	function onRecorrectClick() {
		correctText = correctEssayBox.getText();
		checkText = editableCheckEssayBox.getText();

		const diff = new Diff_ONP(checkText, correctText);
		diff.calc();
		activeDiff.char = diff.getSequence();
		activeDiff.words = diff.getWords();

		checkEssayBox.set(checkText, activeDiff.char);
	}

	async function loadCorrectText() {
		const req = await fetch("/resources/correct.txt");
		correctText = processString(await req.text());
	}

	onMount(() => {
		loadCorrectText();
	});
</script>

<main>
	<header>
		<h1>Diktātify</h1>
	</header>

	<div class="select">
		<EssaySelector on:select={onSelect}/>
	</div>

	<div class="essay essay1">
		<h2>Pareizais</h2>
		<EssayBox text={correctText} bind:this={correctEssayBox} editable={true}/>
	</div>

	<div class="essay essay2">
		<h2>Labošanai {#if checkID}- ID {checkID}{/if}</h2>
		<EssayBox text={checkText} bind:this={editableCheckEssayBox} editable={true}/>
	</div>

	<div class="essay essay3">
		<div class="head">
			<h2>Izlabotais</h2>
			<button on:click={onRecorrectClick}>Pārlabot</button>
		</div>
		<EssayBox bind:this={checkEssayBox}/>
	</div>

	<div class="diff">
		<h2>Kļūdas (WIP)</h2>
		<Diff diff={activeDiff}/>
	</div>
</main>

<style lang="scss">
	main {
		display: grid;
		grid-template-columns: 15vw auto 30vw;
		grid-template-rows: 10vh repeat(3, 27.75vh);
		grid-template-areas: "header header header" "select essay1 diff" "select essay2 diff" "select essay3 diff";
		padding: 1vw;
		gap: 10px;
		height: calc(100vh - 2vw); // Adjust for padding

		> * {
			border: 1px solid black;

			h2 {
				margin-top: 0;
				padding-bottom: 0.45em;
				border-bottom: 1px solid black;
			}
		}
	}

	header {
		grid-area: header;
		display: flex;
		justify-content: center;
	}

	.select {
		height: calc(100% - 2px); // I have no idea why it's 2px longer than everything else at 100%
		grid-area: select;
	}

	.essay, .diff {
		padding: 10px;
		display: grid;
		grid-template-rows: auto 1fr;
	}

	.essay {
		&.essay1 {
			grid-area: essay1;
		}

		&.essay2 {
			grid-area: essay2;
		}

		&.essay3 {
			grid-area: essay3;

			.head {
				display: grid;
				grid-template-columns: 1fr auto;
				border-bottom: 1px solid black;
				margin-bottom: 1rem;

				h2 {
					border: none;
					margin-bottom: 0;
				}

				button {
					height: 1.75em;
					font-size: 1.25rem;
					font-family: "Open sans", sans-serif;
				}
			}
		}
	}

	.diff {
		grid-area: diff;
	}

	h1 {
		text-align: center;
		font-size: 3rem;
		margin: 0;
		display: flex;
		align-items: center;
	}
</style>