<script lang="ts">
	import { onMount } from "svelte";
	export let userClose = true;
	export let title = "";
	export let closeTime = 100;
	export let defaultState = false;
	let stateOpen = defaultState;
	let closeAnim = false;
	let closeTimeout: number | null = null;
	let container: HTMLElement;

	export function isOpen() {
		return stateOpen;
	}

	export function open() {
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
			closeAnim = false;
		} 

		stateOpen = true;
	}

	export function close() {
		closeAnim = true;

		closeTimeout = window.setTimeout(() => {
			stateOpen = false;
			closeAnim = false;
			closeTimeout = null;
		}, closeTime);
	}

	onMount(() => {
		container.style.transition = `opacity ${(closeTime / 1000).toFixed(2)}s`;
	});
</script>

<div
	class="container"
	class:active={stateOpen}
	class:close-anim={closeAnim}
	bind:this={container}
	on:click|self={() => { if (userClose) close(); }}
>
	<div class="content">
		<div class="header">
			<h4>{title}</h4>

			{#if userClose}
				<button class="close" on:click={close}></button>
			{/if}
		</div>

		<slot></slot>
	</div>
</div>

<style lang="scss">
	@import "../../scss/global";

	.container {
		z-index: 1000;

		position: absolute;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.85);
		opacity: 1;

		// transition: opacity $CLOSE_TIME;
		display: none;

		&.close-anim {
			opacity: 0;
		}

		&.active {
			display: flex;
		}
	}

	.content {
		background-color: $COL_BG_REG;
		color: $COL_FG_REG;
		border: 1px solid $COL_ACCENT;
		min-width: 20px;
		min-height: 20px;
		padding: 1vh;
	}
	
	.header {
		display: grid;
		grid-template-columns: 1fr auto;
		column-gap: 1rem;
		border-bottom: 1px solid $COL_BG_LIGHT;
		margin-bottom: 5%;
		padding-bottom: 3%;

		h4 {
			font-family: $FONT_HEADING;
			font-weight: 400;
			margin: 0;
			font-size: 1.25rem;
		}

		.close {
			$SIZE: 1.5rem;

			width: $SIZE;
			height: $SIZE;
			
			@include button_icon(true);
			
			-webkit-mask-image: url(/icons/icon-close.svg);
			mask-image: url(/icons/icon-close.svg);
				
			-webkit-mask-size: 100%;
			mask-size: 100%;

			position: relative;
			right: -0.75vh;
			top: -0.25vh;
		}
	}
</style>