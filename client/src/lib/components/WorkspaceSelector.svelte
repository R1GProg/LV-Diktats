<script lang="ts">
	import { onMount } from "svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import config from "$lib/config.json";
	import WorkspaceUploader from "./modals/WorkspaceUploader.svelte";
	import LoadingWorkspaceStatus from "./modals/status/LoadingWorkspaceStatus.svelte";
	import type { UUID, WorkspacePreview } from "@shared/api-types";

	const activeWorkspaceData = store("activeWorkspaceData") as Stores["activeWorkspaceData"];
	const workspace = store("workspace") as Stores["workspace"];
	const workspaceController = store("workspaceController") as Stores["workspaceController"];

	let data: WorkspacePreview[] = [];
	let active = "";
	// let workspaceUploader: WorkspaceUploader;
	let workspaceLoader: LoadingWorkspaceStatus;

	async function setWorkspace(id: UUID) {
		$activeWorkspaceData = id.length === 0 ? null : (data.find((e) => e.id === id) ?? null);
	}

	$: if ($workspace !== null) workspaceLoader.open($workspace);

	onMount(async () => {
		// Load available workspaces
		data = await (await $workspaceController).getWorkspaces();
	});
</script>

<div class="workspace-selector">
	<select bind:value={active} on:change={() => { setWorkspace(active); }}>
		<option value="">- Izvēlēties datus -</option>
		{#each Object.values(data) as workspace}
			<option value="{workspace.id}">{workspace.name}{workspace.local ? " (LOCAL)" : ""}</option>
		{/each}
		{#if !config.pilotMode}
		<option value="!upload">- Augšupielādēt datus -</option>
		{/if}
	</select>
</div>

<!-- <WorkspaceUploader bind:this={workspaceUploader} /> -->
<LoadingWorkspaceStatus bind:this={workspaceLoader} />

<style lang="scss">
	@import "../scss/global.scss";

	.workspace-selector {
		grid-area: workspace;
		@include dropdown($HEADER_HEIGHT);
	}
</style>