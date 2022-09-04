<script lang="ts">
	import Loader from "$lib/components/lib/Loader.svelte";
	import Modal from "$lib/components/modals/Modal.svelte";

	export let title = "";

	let modal: Modal;

	export async function open(closeCondition: Promise<any>) {
		modal.open();
		await closeCondition;
		modal.close();
	}
</script>

<Modal title={title} userClose={false} closeTime={1000} bind:this={modal}>
	<div class="loader-container">
		<Loader/>
	</div>
</Modal>

<style lang="scss">
	.loader-container {
		display: flex;
		justify-content: center;
		padding-top: 1vh;
		padding-bottom: 1vh;
	}
</style>