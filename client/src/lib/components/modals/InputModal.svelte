<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import Modal from "./Modal.svelte";

	export let title = "";
	export let confirmLabel = "Ok";
	let modal: Modal;

	const dispatcher = createEventDispatcher();

	export function open() {
		modal.open();
	}

	function onConfirmClick() {
		dispatcher("confirm");
		modal.close();
	}

	function onCancelClick() {
		dispatcher("cancel");
		modal.close();
	}
</script>

<Modal title={title} userClose={true} bind:this={modal}>
	<div class="container">
		<slot></slot>
		<div class="input-container">
			<button on:click={onCancelClick}>Atcelt</button>
			<button on:click={onConfirmClick}>{confirmLabel}</button>
		</div>
	</div>
</Modal>

<style lang="scss">
	@import "../../scss/global";

	.container {
		display: grid;
		grid-template-rows: 1fr auto;
		grid-auto-flow: column;
	}

	.input-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 5%;
		margin-top: 3vh;

		button {
			justify-self: center;

			border: 1px solid $COL_ACCENT;
			background-color: $COL_BG_LIGHT;
			color: white;
			font-family: $FONT_HEADING;
			font-size: 1rem;
			text-transform: uppercase;
			padding: 0.15em 1em;
			width: 100%;

			cursor: pointer;
			transition: background-color 0.3s;

			&:hover {
				background-color: $COL_BG_REG;
			}
		}
	}
</style>