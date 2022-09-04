<script lang="ts">
	import { APP_ONLINE } from "$lib/ts/networking";
	import { onMount } from "svelte";
	import StatusModal from "./StatusModal.svelte";
	let modal: StatusModal;

	onMount(() => {
		modal.open(APP_ONLINE);
	});
</script>

<StatusModal title="Checking for server..." bind:this={modal}/>