<script lang="ts">
	import { onMount } from "svelte";
	import { activeWorkspaceID, workspace } from "$lib/ts/stores";
	import config from "$lib/config.json";
	import WorkspaceUploader from "./modals/WorkspaceUploader.svelte";
	import LoadingWorkspaceStatus from "./modals/status/LoadingWorkspaceStatus.svelte";
	import type { UUID, WorkspacePreview } from "@shared/api-types";
	import { api } from "$lib/ts/networking/DiktifyAPI";

	let data: WorkspacePreview[] = [];
	let active = "";
	// let workspaceUploader: WorkspaceUploader;
	let workspaceLoader: LoadingWorkspaceStatus;

	async function setWorkspace(id: UUID) {
		$activeWorkspaceID = id;
	}

	$: if ($workspace !== null) workspaceLoader.open($workspace);

	onMount(async () => {
		// Load available workspaces
		data = await api.getWorkspaces();
	});
</script>

<div class="workspace-selector">
	<select bind:value={active} on:change={() => { setWorkspace(active); }}>
		<option value="">- Izvēlēties datus -</option>
		{#each Object.values(data) as workspace}
			<option value="{workspace.id}">{workspace.name}</option>
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