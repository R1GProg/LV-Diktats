<script lang="ts">
	import { workspace } from "$lib/ts/stores";
	import { downloadText } from "$lib/ts/util";

	function exportData() {
		if ($workspace === null) return;

		downloadText("dati.json", JSON.stringify($workspace));
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