<script lang="ts">
	import StatusModal from "./StatusModal.svelte";
	let modal: StatusModal;

	export async function open(uploadPromise: Promise<any>) {
		modal.open(uploadPromise);
	}
</script>

<StatusModal title="Augšupielādē failus..." bind:this={modal}/>