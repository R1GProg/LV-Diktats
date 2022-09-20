<script lang="ts">
	import { parseCSVPromise } from "$lib/ts/csv";
	import { readTextFile } from "$lib/ts/util";
	import type { Submission, Workspace } from "@shared/api-types";
	import { processString } from "@shared/normalization";
	import InputModal from "./InputModal.svelte";
	import FileUploadStatusModal from "./status/FileUploadStatusModal.svelte";
	let modal: InputModal;
	let fileUploadModal: FileUploadStatusModal;

	let uploadData: { template?: FileList, dataset?: FileList, name?: string } = {};
	let templateInput: HTMLInputElement;
	let datasetInput: HTMLInputElement;
	let saveToLocalStorage = false;

	let promiseResolve: (data: Workspace) => void;
	let promiseReject: () => void;

	export function open() {
		modal.open();

		uploadData.name = "";
		templateInput.value = "";
		datasetInput.value = "";

		return new Promise<Workspace>((res, rej) => {
			promiseResolve = res;
			promiseReject = rej;
		})
	}

	function onConfirm() {
		fileUploadModal.open(new Promise<void>(async (modalResolve) => {
			if (!uploadData.template || !uploadData.dataset || !uploadData.name) {
				// TODO: Show error
				modal.open();
				return;
			}

			const entries: Record<string, Submission> = {};
			const data = await Promise.all([
				readTextFile(uploadData.template[0]),
				parseCSVPromise(uploadData.dataset[0], (result) => {
					const id = result.data.id as string;

					if (!id) return;

					// entries[id] = {
					// 	id,
					// 	text: processString(result.data.message),
					// };
				}),
			]);

			if (data[0] === null) {
				// TODO: Show error
				modal.open();
				modalResolve();
				return;
			}

			const key = encodeURIComponent(uploadData.name.toLowerCase());
			const workspaceData: Workspace = {
				name: uploadData.name,
				id: key,
				template: processString(data[0]),
				submissions: entries,
				// local: true,
				register: [],
			};

			modalResolve();
			promiseResolve(workspaceData);
		}));
	}

	function onCancel() {
		promiseReject();
	}
</script>

<InputModal
	title="Augšupielādēt datus"
	confirmLabel="Augšupielādēt"
	bind:this={modal}
	on:confirm={onConfirm}
	on:cancel={onCancel}
>
	<div class="uploader">
		<label for="workspaceName">Nosaukums</label>
		<input type="text" placeholder="Nosaukums" id="workspaceName" bind:value={uploadData.name}>
		<label for="templateFile">Paraugs</label>
		<input type="file" id="templateFile" accept=".txt" bind:files={uploadData.template} bind:this={templateInput}>
		<label for="datasetFile">Dati</label>
		<input type="file" id="datasetFile" accept=".csv" bind:files={uploadData.dataset} bind:this={datasetInput}>
		<label for="saveLocalStorage">Atcerēties datu ierakstu</label>
		<input type="checkbox" id="saveLocalStorage" bind:value={saveToLocalStorage}>
	</div>
</InputModal>

<FileUploadStatusModal bind:this={fileUploadModal} />

<style lang="scss">
	@import "../../scss/global";

	.uploader {
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