<script lang="ts">
	import EssayBox from "./components/EssayBox.svelte";
	import EssaySelector from "./components/EssaySelector.svelte";
	import Diff from "./components/Diff.svelte";
	import { onMount } from "svelte";
	import type { EssayEntry } from "./types";

	let correctText = "";
	let checkText = "";
	
	function onSelect(e: CustomEvent) {
		const entry = e.detail.entry as EssayEntry;
		checkText = entry.text;
	}

	async function loadCorrectText() {
		const req = await fetch("/resources/correct.txt");
		correctText = await req.text();
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
		<h2>Labošanai</h2>
		<EssayBox text={checkText}/>
	</div>

	<div class="essay essay2">
		<h2>Pareizais</h2>
		<EssayBox text={correctText}/>
	</div>

	<div class="diff">
		<h2>Kļūdas</h2>
		<Diff />
	</div>
</main>

<style lang="scss">
	main {
		display: grid;
		grid-template-columns: 15vw auto 30vw;
		grid-template-rows: 10vh 42vh 42vh;
		grid-template-areas: "header header header" "select essay1 diff" "select essay2 diff";
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