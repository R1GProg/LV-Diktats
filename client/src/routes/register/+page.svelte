<script lang="ts">
	import RegisterEntryModal from "$lib/components/modals/RegisterEntryModal.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import type { RegisterEntry, Workspace } from "@shared/api-types";
	import { onMount } from "svelte";

	const workspace = store("workspace") as Stores["workspace"];
	const ds = store("ds") as Stores["ds"];

	let modal: RegisterEntryModal;

	let register: RegisterEntry[] = [];

	async function onEntryClick(ev: MouseEvent) {
		const ws = await $workspace;
		if (ws === null) return;

		const id = (ev.currentTarget as HTMLElement).dataset.id!;
		modal.open(id);
	}

	async function onWorkspaceChange(ws: Promise<Workspace> | null) {
		if (ws === null) return;

		register = (await ws).register;
	}

	$: onWorkspaceChange($workspace);

	onMount(() => {
		$ds.addRegisterChangeCallback(() => {
			onWorkspaceChange($workspace);
		});

		onWorkspaceChange($workspace);
	});
</script>

<div class="outer-container">
	<table class="container">
		{#if $workspace !== null}
		<tr class="head">
			<th class="head-word">Kļūdas</th>
			<th class="head-desc">Apraksts</th>
			<th class="head-iserror">Kļūda/Nekļūda</th>
			<th class="head-count">Gadījumu skaits</th>
		</tr>
		{#if register.length > 0}
			{#each register as entry}
			{@const wordArr = Object.values(entry._mistakeWords ?? {}).slice(0, 25)}
			<tr data-id={entry.id} on:click={onEntryClick}>
				<td class="entry-words">
					{#each wordArr as word}
					{@const adjWord = word?.replace(/\.\./g, "")}
					<span>{adjWord && adjWord?.length > 30 ? `${adjWord.substring(0, 30).trim()}...` : adjWord}</span>
					{/each}
					{#if wordArr.length !== Object.values(entry._mistakeWords ?? {}).length}
					<span style="font-size: 1.5em; font-weight: 700; position: relative; top: -0.25em;">...</span>
					{/if}
				</td>
				<td class="desc"><span>{entry.description}</span></td>
				<td><span>{entry?.opts?.ignore ? "X" : "+"}</span></td>
				<td><span>{entry.count}</span></td>
			</tr>
			{/each}
		{/if}
		{:else}
		<h2>Nav izvēlēti dati</h2>
		{/if}
	</table>
</div>

<RegisterEntryModal bind:this={modal} />

<style lang="scss">
	@import "../../lib/scss/global";

	.outer-container {
		@include scrollbar;

		overflow-y: auto;
		max-height: 85vh;
		margin-top: 5vh;
		width: 75vw;
		margin-left: auto;
		margin-right: auto;
	}

	.container {
		// display: grid;
		// width: 100%;
		color: $COL_FG_REG;
		// justify-content: center;
		text-align: center;
		border-collapse: collapse;
		border-spacing: 0;
		width: 100%;

		>h2 {
			font-family: $FONT_HEADING;
			font-size: 2rem;
			font-weight: 400;
		}

		th {
			font-family: $FONT_HEADING;
			font-size: 1.5rem;
			width: 100%;
			margin: 0.5em 0;
			display: inline-block;
		}

		tr {
			font-family: $FONT_BODY;
			border-bottom: 1px solid $COL_BG_LIGHT;

			background-color: $COL_BG_REG;
			transition: background-color 0.3s;

			display: grid;
			grid-template-columns: 15vw 30vw 15vw 10vw;

			&.head {
				border-bottom: 3px solid $COL_FG_DARK;
			}

			.desc {
				text-align: left;
			}

			.entry-words {
				display: grid;
				grid-auto-flow: row;
			}

			&:not(.head) {
				cursor: pointer;

				&:hover {
					background-color: $COL_BG_DARK;
				}
			}
		}
	}
</style>