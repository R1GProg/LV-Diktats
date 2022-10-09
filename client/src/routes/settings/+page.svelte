<script lang="ts">
	import { downloadText } from "$lib/ts/util";
	import store, { type Stores } from "$lib/ts/stores";

	const workspace = store("workspace") as Stores["workspace"];
	const workspaceController = store("workspaceController") as Stores["workspaceController"];

	let wsFile: FileList | undefined;

	$: if (wsFile?.length) {
		importWorkspace(wsFile[0]);
		wsFile = undefined;
	}

	async function importWorkspace(file: File) {
		await (await $workspaceController).importWorkspaceFromFile(file);
		location.replace("/");
	}

	async function exportData() {
		const ws = await $workspace;
		if (!ws) return;

		(await $workspaceController).exportWorkspaceToFile(ws);
	}

	async function clearWorkspaceData() {
		// const db = await $workspaceController;
		// db.clear();
		localStorage.removeItem("activeSubmissionID");

		location.replace("/");
	}
</script>

<div class="container">
	<button on:click={exportData} disabled={$workspace === null}>Eksportēt datus</button>
	<button on:click={clearWorkspaceData} disabled={$workspace === null}>Dzēst datus</button>
	<div>
		<label for="wsUpl">Importēt datus</label>
		<input id="wsUpl" type="file" accept=".dws" bind:files={wsFile}>
	</div>
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