<script lang="ts">
	import MistakeRegistrationModal from "$lib/components/modals/MistakeRegistrationModal.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import { space } from "svelte/internal";

	const workspace = store("workspace") as Stores["workspace"];

	let modal: MistakeRegistrationModal;

	async function onEntryClick(ev: MouseEvent) {
		const ws = await $workspace;
		if (ws === null) return;

		const id = (ev.currentTarget as HTMLElement).dataset.id!;

		console.log(ws.register.find((r) => r.id === id));

		// const data = await modal.open(hash, true);
		
		// if (data.action === "EDIT") {
		// 	await actionRegister.updateMistakeInRegister(hash, data.data);
		// } else if (data.action === "DELETE") {
		// 	await actionRegister.deleteMistakeFromRegister(hash);
		// }

		// $workspace.register = $workspace.register;
	}
</script>

<table class="container">
	{#if $workspace !== null}
	<tr class="head">
		<th>Kļūdainie vārdi</th>
		<th>Apraksts</th>
		<th>Uzskatāma par kļūdu?</th>
		<th>Gadījumu skaits</th>
	</tr>
	{#await $workspace then ws}
		{#each ws.register as entry (entry.id)}
		<tr data-id={entry.id} on:click={onEntryClick}>
			<td class="entry-words">
				{#each Object.values(entry._mistakeWords ?? {}) as word}
				<span>{word}</span>
				{/each}
			</td>
			<td class="desc"><span>{entry.description}</span></td>
			<td><span>{entry.ignore ? "Nav kļūda" : ""}</span></td>
			<td><span>{entry.count}</span></td>
		</tr>
		{/each}
	{/await}
	{:else}
	<h2>Nav izvēlēti dati</h2>
	{/if}
</table>

<MistakeRegistrationModal bind:this={modal} />

<style lang="scss">
	@import "../../lib/scss/global";

	.container {
		// display: grid;
		// width: 100%;
		color: $COL_FG_REG;
		// justify-content: center;
		text-align: center;
		margin: 5vh auto;
		border-collapse: collapse;
		border-spacing: 0;

		>h2 {
			font-family: $FONT_HEADING;
			font-size: 2rem;
			font-weight: 400;
		}

		th {
			font-family: $FONT_HEADING;
			font-size: 1.5rem;
			width: 15vw;
			margin: 0.5em 0;
			display: inline-block;
		}

		tr {
			font-family: $FONT_BODY;
			border-bottom: 1px solid $COL_BG_LIGHT;

			background-color: $COL_BG_REG;
			transition: background-color 0.3s;

			display: grid;
			grid-template-columns: repeat(4, 15vw);	

			&.head {
				border-bottom: 3px solid $COL_FG_DARK;
			}

			h3 {
				font-weight: 400;
				font-size: 1.15rem;
				margin: 0;
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