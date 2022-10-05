<script lang="ts">
	import StatusModal from "./StatusModal.svelte";
	let modal: StatusModal;

	export async function open(socketPromise: Promise<any>) {
		modal.open(socketPromise);
	}
</script>

<StatusModal title="Apstrādā..." bind:this={modal}/>