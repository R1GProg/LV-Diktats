<script lang="ts">
	import StatusModal from "./StatusModal.svelte";
	let modal: StatusModal;

	export async function open(promise: Promise<any>) {
		modal.open(promise);
	}
</script>

<StatusModal title="Saglabā..." bind:this={modal}/>