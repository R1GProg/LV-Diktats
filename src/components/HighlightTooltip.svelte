<script lang="ts">
	let active = false;
	let container: HTMLElement;
	let moveTimeout: number | null = null;
	let content = "";

	export function setTooltip(el: HTMLElement, text: string) {
		if (moveTimeout) {
			clearTimeout(moveTimeout);
			moveTimeout = null;
		}

		active = true;
		const rect = el.getBoundingClientRect();

		container.style.top = `${rect.top - 32}px`;

		content = text;

		// The text renders only later in the event loop, so wait until next cycle
		setTimeout(() => {
			container.style.left = `${rect.left - container.clientWidth / 2 + rect.width / 2}px`;
		}, 0);
	}

	export function clearTooltip() {
		active = false;

		// Move only after fade out complete
		moveTimeout = window.setTimeout(() => {
			container.style.left = "0";
			container.style.top = "0";
			content = "";
		}, 400);
	}

	export function isActive() {
		return active;
	}
</script>

<div class="container" class:active={active} bind:this={container}>
	<span>{content}</span>
</div>

<style lang="scss">
	.container {
		position: absolute;
		opacity: 0;
		transition: opacity 0.3s, filter 0.3s;
		background-color: white;
		border: 1px solid black;
		pointer-events: none;
		z-index: 10;

		padding: 0.15em;
	}

	.container.active {
		opacity: 1;
		pointer-events: all;
		box-shadow: 0 0 5px rgba(0,0,0,0.5);
	} 
</style>