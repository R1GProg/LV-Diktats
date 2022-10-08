<script lang="ts">
	import { downloadText } from "$lib/ts/util";
	import store, { type Stores } from "$lib/ts/stores";

	const workspace = store("workspace") as Stores["workspace"];
	const localWorkspaceDatabase = store("localWorkspaceDatabase") as Stores["localWorkspaceDatabase"];

	async function exportData() {
		if (!(await $workspace)) return;

		downloadText("dati.json", JSON.stringify(await $workspace));
	}

	async function clearWorkspaceData() {
		const db = await $localWorkspaceDatabase;
		db.clear();
		localStorage.removeItem("activeSubmissionID");

		location.replace("/");
	}
</script>

<div class="container">
	<button on:click={exportData} disabled={$workspace === null}>Eksportēt datus</button>
	<button on:click={clearWorkspaceData} disabled={$workspace === null}>Dzēst datus</button>
</div>

<style lang="scss">
	.container {
		display: flex;
		justify-content: center;
		padding: 10vh;
		flex-flow: column;
		row-gap: 3vh;
		
		button {
			font-size: 5vh;
			width: 40vw;
			padding: 1vh 0;
			cursor: pointer;
		}
	}
</style>