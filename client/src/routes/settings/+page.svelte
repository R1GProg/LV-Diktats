<script lang="ts">
	import { downloadText } from "$lib/ts/util";
	import store, { type Stores } from "$lib/ts/stores";
	import type { ExportedSubmission, Submission } from "@shared/api-types";
	import { exportSubmission, genURLId } from "$lib/ts/SubmissionExport";

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

	async function exportVis() {
		const ws = await $workspace;

		if (!ws) return;

		const submissions = ws.submissions as unknown as Record<string, Submission>;
		const output: Record<string, { id: string, data: ExportedSubmission }> = {};

		for (const subm of Object.values(submissions)) {
			const data = exportSubmission(subm, ws);
			const urlId = genURLId();

			output[urlId] = {
				id: subm.id,
				data
			};
		}

		downloadText("vis_data.json", JSON.stringify(output));
	}
</script>

<div class="container">
	<button on:click={exportData} disabled={$workspace === null}>Eksportēt datus</button>
	<button on:click={clearWorkspaceData} disabled={$workspace === null}>Dzēst datus</button>
	<button on:click={exportVis} disabled={$workspace === null}>Eksportēt vizualizāciju</button>
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