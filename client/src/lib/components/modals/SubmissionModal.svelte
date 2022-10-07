<script lang="ts">
	import Modal from "./Modal.svelte";
	import store, { SortMode, type Stores } from "$lib/ts/stores";
	import { createEventDispatcher, onMount } from "svelte";
	import type { Submission, SubmissionPreview, Workspace } from "@shared/api-types";

	const workspace = store("workspace") as Stores["workspace"];
	const sort = store("sort") as Stores["sort"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const sortedSubmissions = store("sortedSubmissions") as Stores["sortedSubmissions"];

	const dispatch = createEventDispatcher();

	let modal: Modal;
	let searchQuery: string = "";
	let filteredSubmissions: SubmissionPreview[] | null = null;
	let noSearchResults = false;

	export function open() {
		modal.open();
	}

	function onEntryClick(ev: MouseEvent) {
		const id = (ev.currentTarget as HTMLElement).dataset.id;
		dispatch("open", { id });
		modal.close();
	}

	$: if (searchQuery === "") {
		noSearchResults = false;
		filteredSubmissions = $sortedSubmissions;
	} else if ($sortedSubmissions !== null) {
		const minimizedQuery = searchQuery.toLowerCase().replace("id", "");
		const filtered = $sortedSubmissions.filter((subm) => subm.id.toString().startsWith(minimizedQuery));

		if (filtered.length === 0) {
			noSearchResults = true;
		} else {
			noSearchResults = false;
			filteredSubmissions = filtered;
		}
	}

	onMount(() => {
		$sort = Number(localStorage.getItem("sortMode"));
	});
</script>

<Modal title="Visi iesūtījumi" userClose={true} bind:this={modal}>
	<input type="text" placeholder="Meklēt" bind:value={searchQuery} class="subm-search">
	<span class="no-search-res" class:enabled={noSearchResults}>ID netika atrasts</span>

	<div class="sortSelect">
		<select bind:value={$sort}>
			<option value={SortMode.MISTAKE}>Kārtot pēc kļūdu skaita</option>
			<option value={SortMode.ID}>Kārtot pēc ID</option>
		</select>
	</div>

	<div class="listContainer">
		{#if filteredSubmissions !== null}
		{#each filteredSubmissions as entry (entry.id)}
			<div
				data-id={entry.id}
				data-state={entry.state}
				data-active={entry.id === $activeSubmissionID ? "" : null}
				on:click={onEntryClick}
			>
				<h3 class="id">ID{entry.id}</h3>
				<span class="errnr">{entry?.mistakeCount ?? entry.data.mistakes.length} kļūdas</span>
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

	.subm-search {
		$PADDING: 0.1em;

		font-size: 1.25rem;
		margin-bottom: 0.5em;
		padding: calc(2 * #{$PADDING}) $PADDING $PADDING $PADDING;
		width: calc(100% - 3 * $PADDING);

		background-color: $COL_BG_LIGHT;
		color: $COL_FG_REG;
		border: 1px solid $COL_BG_DARK;
	}

	.no-search-res {
		display: none;	
		color: $COL_FG_REG;
		font-family: $FONT_HEADING;
		width: 100%;
		text-align: center;
		margin-bottom: 10px;

		&.enabled {
			display: block;
		}
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

			&[data-state="DONE"] {
				h3 {
					color: $COL_SUBM_DONE;
				}
			}

			&[data-state="REJECTED"] {
				h3 {
					color: $COL_SUBM_REJECTED;
				}
			}

			&[data-active] {
				h3 {
					color: rgb(210, 180, 20);
				}
			}
		}
	}
</style>