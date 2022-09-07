<script lang="ts">
	import { APP_ONLINE } from "$lib/ts/networking";
	import { onMount } from "svelte";
	import WorkspaceUploader from "./modals/WorkspaceUploader.svelte";
	import { workspace } from "$lib/ts/stores";
	import type { EssayEntry, Workspace } from "$lib/types";
	import { loadLocalWorkspaces } from "$lib/ts/WorkspaceLocalStorage";
	import config from "$lib/config.json";
import { Mistake } from "@shared/diff-engine";

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

		const req = await fetch("/dataset.json");
		const pregen = await req.json();

		const template = pregen.template.message;
		const entries: EssayEntry[] = pregen.submissions
		.map((s: any) => ({
			id: s.id,
			text: s.message,
			mistakes: s.mistakes
		}))
		.filter((e: EssayEntry) => e.text!.length > template.length * config.incompleteFraction);

		const dataset: Record<string, EssayEntry> = {};

		for (const e of entries) {
			dataset[e.id] = e;
		}

		const name = "Mazsālīto gurķu blūzs"
		const key = "gurkubluzs";

		const w: Workspace = {
			template,
			dataset,
			register: {},
			local: true,
			name,
			key
		};

		data[key] = { key, name, data: w };

		console.log(pregen);
		console.log(w);
	});
</script>

<div class="workspace-selector">
	<select bind:value={active} on:change={() => { loadWorkspace(active); }}>
		<option value="">- Izvēlēties datus -</option>
		{#each Object.values(data) as workspace}
			<option value="{workspace.key}">{workspace.name}</option>
		{/each}
		{#if !config.pilotMode}
		<option value="!upload">- Augšupielādēt datus -</option>
		{/if}
	</select>
</div>

<WorkspaceUploader bind:this={workspaceUploader} />

<style lang="scss">
	@import "../scss/global.scss";

	.workspace-selector {
		grid-area: workspace;
		@include dropdown($HEADER_HEIGHT);
	}
</style>