<script lang="ts">
	import type { MistakeHash } from "@shared/diff-engine";
	import InputModal from "./InputModal.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import type { RegisterEntry, RegisterEntryData, UUID } from "@shared/api-types";
	import { v4 as uuidv4 } from "uuid";

	const workspace = store("workspace") as Stores["workspace"];

	let modal: InputModal;
	let desc = "";
	let ignore = false;
	let isVariation = false;
	let variation = "";
	
	let edit = false;
	let curMistake: MistakeHash;
	let curRegisterEntry: UUID | null = null;
	let register: RegisterEntry[] = [];

	let promiseResolve: (entry: RegisterEntryData) => void;
	let promiseReject: () => void;

	export function open(
		hash: MistakeHash,
		mode: "ADD" | "EDIT" = "ADD",
		registerId: UUID | null = null
	) {
		return new Promise<RegisterEntryData>(async (res, rej) => {
			const ws = await $workspace;

			if (ws === null) {
				rej();
				return;
			}

			register = ws.register;

			if (mode === "ADD") {
				desc = "";
				ignore = false;
				edit = false;
			} else {
				const existingEntry = register.find((e) => e.id === registerId);

				if (!existingEntry) {
					rej();
					return;
				}

				desc = existingEntry.description;
				ignore = existingEntry.ignore;
				edit = true;
			}

			curRegisterEntry = registerId;
			curMistake = hash;

			modal.open();
			promiseResolve = res;
			promiseReject = rej;
		})
	}

	async function onConfirm() {
		const ws = await $workspace;
		if (ws === null) return;

		promiseResolve({
			id: curRegisterEntry ?? undefined,
			mistakes: [ curMistake ],
			description: desc,
			ignore,
			action: edit ? "EDIT" : "ADD"
		});
	}

	function onCancel() {
		promiseReject();
	}

	function onCustom(ev: CustomEvent) {
		const key = ev.detail.key;

		if (key !== "delete") return;

		promiseResolve({
			action: "DELETE",
			id: curRegisterEntry!,
			mistakes: [ curMistake ]
		});
	}

	async function onVariationSelect() {
		const ws = await $workspace;
		if (ws === null) return;

		// const entry = ws.register[variation];

		// desc = entry.desc;
		// ignore = entry.ignore;
	}
</script>

<InputModal
	title={edit ? "Rediģēt reģistrētu kļūdu" : "Reģistrēt kļūdu"}
	confirmLabel={edit ? "Rediģēt" : "Reģistrēt"}
	bind:this={modal}
	extraButtons={edit ? { delete: "Izdzēst" } : {}}
	on:confirm={onConfirm}
	on:cancel={onCancel}
	on:custom={onCustom}
>
	<div class="container">
		<label for="regVariation">Variācija esošam ierakstsam</label>
		<input type="checkbox" id="regVariation" bind:checked={isVariation}>

		<!-- {#if isVariation}
		<label for="regVariationSelect">Esošais ieraksts</label>
		<div class="regVariationSelectContainer">
			<select id="regVariationSelect" on:change={onVariationSelect} bind:value={variation}>
				<option value="">- Izvēlēties ierakstu -</option>
				{#each Object.keys($workspace.register) as hash}
				{@const entry = $workspace.register[hash]}
				<option value={hash}>{entry.word} - {entry.desc}</option>
				{/each}
			</select>
		</div>
		{/if} -->

		<label for="regDescription">Kļūdas apraksts</label>
		<textarea disabled={isVariation ? true : false} type="text" id="regDescription" placeholder="Kļūdas apraksts" cols="30" rows="5" bind:value={desc}/>
		<label for="regIgnore">Nav uzskatāma par kļūdu</label>
		<input disabled={isVariation ? true : false} type="checkbox" id="regIgnore" bind:checked={ignore}>
	</div>
</InputModal>

<style lang="scss">
	@import "../../scss/global";

	.container {
		display: grid;
		grid-template-columns: auto 1fr;
		row-gap: 1rem;
		column-gap: 1rem;
		text-align: left;
		padding: 0 1vh 1vh 1vh;

		label {
			font-family: $FONT_HEADING;
		}

		input {
			justify-self: flex-start;
		}

		input, textarea {
			&[disabled] {
				filter: brightness(50%);
			}
		}

		.regVariationSelectContainer {
			@include dropdown(3rem);
		}
	}
</style>