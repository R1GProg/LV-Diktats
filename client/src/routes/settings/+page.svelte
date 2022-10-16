<script lang="ts">
	import { downloadText } from "$lib/ts/util";
	import store, { type Stores } from "$lib/ts/stores";
	import type { ExportedSubmission, Submission } from "@shared/api-types";
	import { exportSubmission, genURLId } from "$lib/ts/SubmissionExport";
	import { parseDebugWorkspace } from "$lib/ts/networking/DiktifyAPI";

	const workspace = store("workspace") as Stores["workspace"];
	const localWorkspaceDatabase = store("localWorkspaceDatabase") as Stores["localWorkspaceDatabase"];
	const workspaceCache = store("cache") as Stores["cache"];

	let fileImports: FileList;

	async function exportData() {
		if (!(await $workspace)) return;

		downloadText("dati.json", JSON.stringify(await $workspace));
	}

	async function clearData(){
		const db = await $localWorkspaceDatabase;
		db.clear();
		localStorage.removeItem("activeSubmissionID");

		const cache = await $workspaceCache;
		cache.clearEntireCache();
	}

	async function clearWorkspaceData() {
		clearData();

		location.replace("/");
	}

	async function exportVis() {
		const ws = await $workspace;

		if (!ws) return;

		const submissions = Object.values(ws.submissions as unknown as Record<string, Submission>);
		const submTest = submissions.filter((s) => s.id === "9999");
		const output: Record<string, { id: string, data: ExportedSubmission }> = {};

		for (const subm of submissions) {
			const data = exportSubmission(subm, ws);
			const urlId = genURLId();

			output[urlId] = {
				id: subm.id,
				data
			};
		}

		// console.log(output);
		downloadText("vis_data.json", JSON.stringify(output));
	}

	async function importData() {
		const reader = new FileReader();

		reader.onload = async (ev) => {
			let data: any;

			try {
				data = JSON.parse(ev.target!.result as string);
			} catch (err) {
				console.error(err);
				return;
			}

			// Clear old data
			await clearData();

			// Add new data
			const ws = await parseDebugWorkspace(data);
			await db.updateWorkspace(ws);

			setTimeout(() => { location.replace("/"); }, 500);
		};

		reader.readAsText(fileImports[0]);
	}
</script>

<div class="container">
	<button on:click={exportData} disabled={$workspace === null}>Eksportēt datus</button>
	<button on:click={exportVis} disabled={$workspace === null}>Eksportēt vizualizāciju</button>
	<hr>
	<div>
		<label for="fileImport">Importēt datus</label>
		<input type="file" accept=".json" id="fileImport" bind:files={fileImports} on:change={importData}>
	</div>

	<br><br><br><br><br><br><br><br><br><br>
	<hr>
	<button on:click={clearWorkspaceData} disabled={$workspace === null}>Dzēst datus</button>
</div>

<style lang="scss">
	@import "../../lib/scss/global.scss";

	.container {
		color: $COL_FG_REG;
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