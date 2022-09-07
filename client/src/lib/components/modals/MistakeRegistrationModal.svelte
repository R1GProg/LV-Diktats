<script lang="ts">
	import type { Mistake, MistakeId } from "@shared/diff-engine";
	import InputModal from "./InputModal.svelte";
	import { workspace } from "$lib/ts/stores";
	import type { RegisterEntryData } from "$lib/types";

	let modal: InputModal;
	let desc = "";
	let ignore = false;
	
	let edit = false;

	let promiseResolve: (entry: RegisterEntryData) => void;
	let promiseReject: () => void;

	export function open(m: Mistake) {
		return new Promise<RegisterEntryData>(async (res, rej) => {
			if ($workspace === null) rej();

			modal.open();

			if (m.isRegistered) {
				const hash = await m.genHash();
				const entry = $workspace!.register[hash];

				desc = entry.desc;
				ignore = entry.ignore;
				edit = true;
			} else {
				desc = "";
				ignore = false;
				edit = false
			}

			promiseResolve = res;
			promiseReject = rej;
		})
	}

	function onConfirm() {
		promiseResolve({ data: { desc, ignore }, action: edit ? "EDIT" : "ADD" });
	}

	function onCancel() {
		promiseReject();
	}

	function onCustom(ev: CustomEvent) {
		const key = ev.detail.key;

		if (key !== "delete") return;

		promiseResolve({data: {desc: "", ignore: false}, action: "DELETE" });
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
		<label for="regDescription">Kļūdas apraksts</label>
		<textarea type="text" id="regDescription" placeholder="Kļūdas apraksts" cols="30" rows="5" bind:value={desc}/>
		<label for="regIgnore">Nav uzskatāma par kļūdu</label>
		<input type="checkbox" id="regIgnore" bind:checked={ignore}>
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
	}
</style>