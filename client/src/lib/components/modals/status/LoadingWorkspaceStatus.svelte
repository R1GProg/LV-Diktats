<script lang="ts">
	import StatusModal from "./StatusModal.svelte";
	let modal: StatusModal;

	export async function open(downloadPromise: Promise<any>) {
		modal.open(downloadPromise);
	}
</script>

<StatusModal title="Lejupielādē darbavietu..." bind:this={modal}/>