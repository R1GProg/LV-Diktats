<script lang="ts">
	import { APP_ONLINE } from "$lib/ts/networking";
	import { onMount } from "svelte";
	import WorkspaceUploader from "./modals/WorkspaceUploader.svelte";
	import { workspace } from "$lib/ts/stores";
	import type { Workspace } from "$lib/types";
	import { loadLocalWorkspaces } from "$lib/ts/WorkspaceLocalStorage";

	// data: Workspace should be defined for cached workspaces or uploaded workspaces
	let data: Record<string, { key: string, name: string, data?: Workspace }> = {};
	let active = "";
	let workspaceUploader: WorkspaceUploader;

	function fetchAvailableWorkspaces() {
		throw "NYI";
	}

	async function loadWorkspace(key: string) {
		if (key === "") {
			// Clear the current workspace
			$workspace = null;
			return;
		}
		
		if (key === "!upload") {
			active = "";

			try {
				const workspaceData = await workspaceUploader.open();

				data[workspaceData.key] = {
					key: workspaceData.key,
					name: workspaceData.name,
					data: workspaceData,
				};

				data = data; // Update Svelte
				active = workspaceData.key;

				$workspace = workspaceData;
			} catch {}

			return;
		}
		
		if (!(key in data)) {
			console.error(`Attempt to open non-existant workspace "${key}"`);
			return;
		}

		if (data[key].data) {
			$workspace = data[key].data!;
			return;
		}

		// TODO: Load server workspaces here
	}

	onMount(async () => {
		if (await APP_ONLINE) {
			fetchAvailableWorkspaces();
		}

		for (const entry of loadLocalWorkspaces()) {
			data[entry.key] = {
				key: entry.key,
				name: entry.name,
				data: entry,
			}
		}
	});
</script>

<div class="workspace-selector">
	<select bind:value={active} on:change={() => { loadWorkspace(active); }}>
		<option value="">- Izvēlēties datus -</option>
		{#each Object.values(data) as workspace}
			<option value="{workspace.key}">{workspace.name}</option>
		{/each}
		<option value="!upload">- Augšupielādēt datus -</option>
	</select>
</div>

<WorkspaceUploader bind:this={workspaceUploader} />

<style lang="scss">
	@import "../scss/global.scss";

	.workspace-selector {
		grid-area: workspace;
		display: grid;
		height: 100%;
		align-items: center;
		grid-template-areas: "select";

		select {
			appearance: none;
			border: none;

			width: 100%;

			margin: 0;
			padding: 5px clamp(1.5em, 2vw , 2em) 5px 10px;

			font-family: $FONT_HEADING;
			font-size: calc(#{$HEADER_HEIGHT} / 3);
			cursor: pointer;

			color: $COL_FG_REG;
			background-color: $COL_BG_LIGHT;
			transition: background-color 0.3s;

			grid-area: select;


			&:focus {
				outline: 1px solid $COL_FG_DARK;
			}
		}

		&::after {
			content: "";
			width: 0.9em;
			height: 0.6em;
			justify-self: end;
			margin-right: 0.5em;
			margin-top: 0.15em;
			background-color: $COL_FG_DARK;
			clip-path: polygon(100% 0%, 0 0%, 50% 100%);

			transition: background-color 0.3s;

			grid-area: select;
		}

		&:hover {
			select {
				background-color: $COL_BG_REG;
			}

			&::after {
				background-color: $COL_FG_REG;
			}
		}
	}
</style>