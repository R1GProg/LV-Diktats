<script lang="ts">
	import type { UUID, Workspace } from "@shared/api-types";
	import store, { type Stores } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";

	const workspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const workspace = store("workspace") as Stores["workspace"];
	const mode = store("mode") as Stores["mode"];
	const selectedMultiVariation = store("selectedMultiVariation") as Stores["selectedMultiVariation"];

	let variationID: UUID;
	let variations: { id: UUID, desc: string }[] = [];

	async function setVariations(workspace: Promise<Workspace> | null) {
		const ws = await workspace;

		if (ws === null) {
			variations = [];
			return;
		}

		variations = ws.register.map((r) => ({ id: r.id, desc: r.description }));
		variations.sort((a, b) => a.desc.localeCompare(b.desc));
	}

	$: setVariations($workspace);
	$: $selectedMultiVariation = variationID === "" ? null : variationID;
</script>

<div class="selector" class:hidden={$mode !== ToolbarMode.REGISTER_MULTI}>
	<select
		bind:value={variationID}
		disabled={workspaceID === null}
	>
		<option value="">- Izvēlēties variāciju -</option>
		{#each variations as variation}
			<option value="{variation.id}">{variation.desc}</option>
		{/each}
	</select>
</div>

<style lang="scss">
	@import "../scss/global.scss";

	.selector {
		grid-area: variation;
		max-width: 25vw;
		margin-right: 10px;
		@include dropdown($HEADER_HEIGHT);
	}

	.hidden {
		display: none;
	}
</style>