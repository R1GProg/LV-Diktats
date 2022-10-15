<script lang="ts">
	import "@shared/visualizer/visualizer.css";
	import { exportSubmission } from "$lib/ts/SubmissionExport";
	import { subToToolbarMode, ToolbarMode, type ToolbarModeEvent } from "$lib/ts/toolbar";
	import { renderCorrect } from "@shared/visualizer";
	import { onMount } from "svelte";
	import store, { type Stores } from "$lib/ts/stores";

	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const workspace = store("workspace") as Stores["workspace"];
	const mode = store("mode") as Stores["mode"];

	let visContainer: HTMLElement;

	async function loadVisualization() {
		const ws = await $workspace;
		const subm = await $activeSubmission;
		
		if ($activeSubmission === null) return;
		if (ws === null || subm === null) return;
		
		visContainer.innerHTML = "";
		renderCorrect("visContainer", exportSubmission(subm, ws), false);
	}

	onMount(async () => {
		subToToolbarMode(async (ev: ToolbarModeEvent) => {
			if (ev.newMode !== ToolbarMode.VIEW) return;
			loadVisualization();
		});

		if ($mode === ToolbarMode.VIEW) loadVisualization();
	});
</script>

<div class="main-container">
	<div id="visContainer" bind:this={visContainer}></div>
</div>

<style lang="scss">
	@import "../scss/global.scss";

	.main-container {
		@include scrollbar;

		color: white;
		overflow-y: auto;
		overflow-x: hidden;
		height: 100%;
	}
</style>