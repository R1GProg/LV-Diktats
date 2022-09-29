<script lang="ts">
	import { downloadText } from "$lib/ts/util";
	import store, { type Stores } from "$lib/ts/stores";

	const workspace = store("workspace") as Stores["workspace"];

	async function exportData() {
		console.log(await $workspace);

		if (!(await $workspace)) return;

		downloadText("dati.json", JSON.stringify(await $workspace));
	}
</script>

<div class="container">
	<button on:click={exportData} disabled={$workspace === null}>Eksportēt datus</button>
</div>

<style lang="scss">
	.container {
		display: flex;
		justify-content: center;
		padding: 10vh;
		
		button {
			font-size: 20vh;
			cursor: pointer;
		}
	}
</style>