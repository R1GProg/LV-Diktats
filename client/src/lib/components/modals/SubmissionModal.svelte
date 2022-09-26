<script lang="ts">
	import Modal from "./Modal.svelte";
	import store, { SortMode, type Stores } from "$lib/ts/stores";
	import { createEventDispatcher } from "svelte";
	import type { Submission, SubmissionPreview, Workspace } from "@shared/api-types";

	const workspace = store("workspace") as Stores["workspace"];
	const sort = store("sort") as Stores["sort"];

	const dispatch = createEventDispatcher();

	let modal: Modal;
	let openSortMode: SortMode;
	let submArray: SubmissionPreview[] = [];

	export function open() {
		modal.open();
		openSortMode = $sort;
	}

	function onEntryClick(ev: MouseEvent) {
		const id = (ev.currentTarget as HTMLElement).dataset.id;
		dispatch("open", { id });
		modal.close();
	}

	function onClose() {
		if ($sort !== openSortMode) {
			dispatch("sortchange");
		}
	}

	async function onResort(workspace: Promise<Workspace> | null, sort: SortMode) {
		if (workspace === null) {
			submArray = [];
			return;
		}

		const ws = await workspace;
		const vals = Object.values(ws.submissions);

		if (sort === SortMode.ID) {
			vals.sort((a, b) => Number(a.id) - Number(b.id));
		} else {
			vals.sort((a, b) => b.mistakeCount - a.mistakeCount);
		}
		
		submArray = vals;
	}

	$: onResort($workspace, $sort);
</script>

<Modal title="Visi iesūtījumi" userClose={true} bind:this={modal} on:close={onClose}>
	<div class="sortSelect">
		<select bind:value={$sort}>
			<option value={SortMode.MISTAKE}>Kārtot pēc kļūdu skaita</option>
			<option value={SortMode.ID}>Kārtot pēc ID</option>
		</select>
	</div>

	<div class="listContainer">
		{#if $workspace !== null}
		{#each submArray as entry (entry.id)}
			<div
				data-id={entry.id}
				on:click={onEntryClick}
			>
				<h3 class="id">ID{entry.id}</h3>
				<span class="errnr">{entry?.mistakeCount} kļūdas</span>
				<span class="open">Atvērt</span>
			</div>
		{/each}
		{/if}
	</div>
</Modal>

<style lang="scss">
	@import "../../scss/global";

	.sortSelect {
		@include dropdown(3.5rem);

		margin-bottom: 1rem;
		width: 100%;
	}

	.listContainer {
		display: grid;
		grid-auto-flow: row;
		max-height: 70vh;
		min-width: 20vw;
		overflow-y: auto;
		padding: 0 1vw 1vw 1vw;

		@include scrollbar;

		>div {
			border-bottom: 1px solid $COL_FG_DARK;
			display: grid;
			grid-auto-flow: column;
			padding: 0.5rem;
			align-items: center;

			background-color: $COL_BG_REG;
			transition: background-color 0.3s;
			cursor: pointer;

			&:hover {
				background-color: $COL_BG_DARK;

				.open {
					opacity: 1;
				}
			}

			span {
				font-family: $FONT_BODY;
			}

			h3 {
				font-family: $FONT_HEADING;
				font-size: 1.5rem;
				margin: 0;
			}

			.open {
				opacity: 0;
				transition: opacity 0.3s;
				font-family: $FONT_HEADING;
				font-size: 1rem;
				display: flex;
				justify-self: flex-end;
				text-transform: uppercase;
			}
		}
	}
</style>