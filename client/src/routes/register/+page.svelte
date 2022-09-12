<script lang="ts">
	import { workspace } from "$lib/ts/stores";
	import MistakeRegistrationModal from "$lib/components/modals/MistakeRegistrationModal.svelte";
	import { ActionRegister } from "$lib/ts/ActionRegister";

	let modal: MistakeRegistrationModal;
	let actionRegister: ActionRegister = new ActionRegister();

	async function onEntryClick(ev: MouseEvent) {
		if ($workspace === null) return;

		const hash = (ev.currentTarget as HTMLElement).dataset.hash!;
		const data = await modal.open(hash, true);
		
		if (data.action === "EDIT") {
			await actionRegister.updateMistakeInRegister(hash, data.data);
		} else if (data.action === "DELETE") {
			await actionRegister.deleteMistakeFromRegister(hash);
		}

		$workspace.register = $workspace.register;
	}

	function getMistakeOccurences(hash: string) {
		console.log($workspace!.mistakeData!.find((m) => m.hash === hash));

		return $workspace!.mistakeData!.find((m) => m.hash === hash)!.occurrences;
	}
</script>

<table class="container">
	{#if $workspace !== null}
	<tr class="head">
		<th>Kļūdainais vārds</th>
		<th>Apraksts</th>
		<th>Uzskatāma par kļūdu?</th>
		<th>Gadījumu skaits</th>
	</tr>
	{#each Object.keys($workspace.register) as hash (hash)}
	{@const entry = $workspace.register[hash]}
	<tr data-hash={hash} on:click={onEntryClick}>
		<td><h3>{entry.word}</h3></td>
		<td class="desc"><span>{entry.desc}</span></td>
		<td><span>{entry.ignore ? "Nav kļūda" : ""}</span></td>
		<td><span>{getMistakeOccurences(hash)}</span></td>
	</tr>
	{/each}
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

			&:not(.head) {
				cursor: pointer;

				&:hover {
					background-color: $COL_BG_DARK;
				}
			}
		}
	}
</style>