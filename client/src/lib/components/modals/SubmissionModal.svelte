<script lang="ts">
	import Modal from "./Modal.svelte";
	import { workspace } from "$lib/ts/stores";
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	let modal: Modal;

	export function open() {
		modal.open();
	}

	function onEntryClick(ev: MouseEvent) {
		const id = (ev.currentTarget as HTMLElement).dataset.id;
		dispatch("open", { id });
		modal.close();
	}

	$: submArray = (() => {
		const vals = $workspace === null ? [] : Object.values($workspace.dataset);
		vals.sort((a, b) => b.mistakes!.length - a.mistakes!.length);
		return vals;
	})();
</script>

<Modal title="Visi iesūtījumi" userClose={true} bind:this={modal}>
	<div class="listContainer">
		{#if $workspace !== null}
		{#each submArray as entry (entry.id)}
			<div
				data-id={entry.id}
				on:click={onEntryClick}
			>
				<h3 class="id">ID{entry.id}</h3>
				<span class="errnr">{entry?.mistakes?.length} kļūdas</span>
				<span class="open">Atvērt</span>
			</div>
		{/each}
		{/if}
	</div>
</Modal>

<style lang="scss">
	@import "../../scss/global";

	.listContainer {
		display: grid;
		grid-auto-flow: row;
		max-height: 70vh;
		min-width: 20vw;
		overflow-y: auto;
		padding: 1vw;

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