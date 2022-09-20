<script lang="ts">
	import { initSub, ToolbarMode } from "$lib/ts/toolbar";
	import { createEventDispatcher, onMount } from "svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import config from "$lib/config.json";

	const mode = store("mode") as Stores["mode"];

	const dispatch = createEventDispatcher();

	function onBtnClick(newMode: ToolbarMode) {
		$mode = newMode;

		dispatch("change", { $mode });
	}

	onMount(() => {
		initSub(mode);
	});
</script>

<div>
	<button
		class="btn-read"
		class:active={$mode === ToolbarMode.READ}
		on:click={() => { onBtnClick(ToolbarMode.READ); }}
		title="Lasīt"
	></button>
	{#if !config.pilotMode}
	<button
		class="btn-edit"
		class:active={$mode === ToolbarMode.EDIT}
		on:click={() => { onBtnClick(ToolbarMode.EDIT); }}
		title="Rediģēt"
	></button>
	{/if}
	<button
		class="btn-ignore"
		class:active={$mode === ToolbarMode.IGNORE}
		on:click={() => { onBtnClick(ToolbarMode.IGNORE) }}
		title="Izņemt tekstu"
	></button>
	<button
		class="btn-merge"
		class:active={$mode === ToolbarMode.MERGE}
		on:click={() => { onBtnClick(ToolbarMode.MERGE); }}
		title="Apvienot kļūdas"
	></button>
	<button
		class="btn-register"
		class:active={$mode === ToolbarMode.REGISTER}
		on:click={() => { onBtnClick(ToolbarMode.REGISTER); }}
		title="Reģistrēt kļūdas"
	></button>
</div>

<style lang="scss">
	@import "../scss/global.scss";

	$TOOLBAR_ICON_SIZE: clamp(35px, 2.5vw, 200px);

	div {
		border: 1px solid $COL_ACCENT;
		border-left: none;
		background-color: $COL_BG_DARK;
		grid-area: "toolbar";
		width: $TOOLBAR_ICON_SIZE;
		height: fit-content;
		padding: 7%;

		display: grid;
		grid-auto-flow: row;
		row-gap: calc(#{$TOOLBAR_ICON_SIZE} * 0.3);

		position: relative;
		top: 0;

		button {
			width: $TOOLBAR_ICON_SIZE;
			height: $TOOLBAR_ICON_SIZE;

			@include button_icon;

			&.btn-read {
				-webkit-mask-image: url(/icons/icon-read.svg);
				mask-image: url(/icons/icon-read.svg);

				-webkit-mask-size: 90%;
				mask-size: 90%;
			}

			&.btn-edit {
				-webkit-mask-image: url(/icons/icon-edit.svg);
				mask-image: url(/icons/icon-edit.svg);

				-webkit-mask-size: 80%;
				mask-size: 80%;
			}

			&.btn-ignore {
				-webkit-mask-image: url(/icons/icon-ignore.svg);
				mask-image: url(/icons/icon-ignore.svg);

				-webkit-mask-size: 100%;
				mask-size: 100%;
			}

			&.btn-merge {
				-webkit-mask-image: url(/icons/icon-merge.svg);
				mask-image: url(/icons/icon-merge.svg);

				-webkit-mask-size: 90%;
				mask-size: 90%;
			}

			&.btn-register {
				-webkit-mask-image: url(/icons/icon-register.svg);
				mask-image: url(/icons/icon-register.svg);

				-webkit-mask-size: 95%;
				mask-size: 95%;
			}
		}
	}
</style>