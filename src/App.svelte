<script lang="ts">
	import EssayBox from "./components/EssayBox.svelte";
	import EssaySelector from "./components/EssaySelector.svelte";
	import Diff from "./components/Diff.svelte";
</script>

<main>
	<header>
		<h1>Diktātify</h1>
	</header>

	<div class="select">
		<EssaySelector />
	</div>

	<div class="essay1">
		wrong essay
		<EssayBox />
	</div>

	<div class="essay2">
		correct essay
		<EssayBox />
	</div>

	<div class="diff">
		diff
		<Diff />
	</div>
</main>

<style lang="scss">
	main {
		display: grid;
		grid-template-columns: 15vw auto 30vw;
		grid-template-rows: 10vh 1fr 1fr;
		grid-template-areas: "header header header" "select essay1 diff" "select essay2 diff";
		padding: 1vw;
		gap: 10px;
		height: calc(100vh - 2vw); // Adjust for padding

		> * {
			border: 1px solid black;
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

	.essay1 {
		grid-area: essay1;
	}

	.essay2 {
		grid-area: essay2;
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