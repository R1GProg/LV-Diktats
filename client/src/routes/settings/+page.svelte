<script lang="ts">
	import { downloadText } from "$lib/ts/util";
	import store from "$lib/ts/stores";

	function exportData() {
		if (store("workspace") === null) return;

		downloadText("dati.json", JSON.stringify(store("workspace")));
	}
</script>

<div class="container">
	<button on:click={exportData} disabled={store("workspace") === null}>Eksportēt datus</button>
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