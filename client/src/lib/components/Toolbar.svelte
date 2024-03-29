<script lang="ts">
	import { initSub, ToolbarMode } from "$lib/ts/toolbar";
	import { createEventDispatcher, onMount } from "svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import config from "$lib/config.json";

	const mode = store("mode") as Stores["mode"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];

	const dispatch = createEventDispatcher();

	function onBtnClick(newMode: ToolbarMode) {
		$mode = newMode;

		dispatch("change", { $mode });
	}

	onMount(() => {
		initSub(mode);
	});
</script>

<div class="outer-container" class:active={$activeSubmissionID !== null}>
	<div class="inner-container">
		<button
			class="btn-read"
			class:active={$mode === ToolbarMode.READ}
			on:click={() => { onBtnClick(ToolbarMode.READ); }}
		></button>
		<span class:active={$mode === ToolbarMode.READ}>Lasīt</span>
		<button
			class="btn-view"
			class:active={$mode === ToolbarMode.VIEW}
			on:click={() => { onBtnClick(ToolbarMode.VIEW); }}
		></button>
		<span class:active={$mode === ToolbarMode.VIEW}>Skatīt labojumu</span>
		<!-- {#if !config.pilotMode}
		<button
			class="btn-edit"
			class:active={$mode === ToolbarMode.EDIT}
			on:click={() => { onBtnClick(ToolbarMode.EDIT); }}
		></button>
		<span class:active={$mode === ToolbarMode.EDIT}>Rediģēt</span>
		{/if} -->
		<button
			class="btn-ignore"
			class:active={$mode === ToolbarMode.IGNORE}
			on:click={() => { onBtnClick(ToolbarMode.IGNORE) }}
		></button>
		<span class:active={$mode === ToolbarMode.IGNORE}>Izņemt tekstu</span>
		<!-- <button
			class="btn-merge"
			class:active={$mode === ToolbarMode.MERGE}
			on:click={() => { onBtnClick(ToolbarMode.MERGE); }}
		></button>
		<span class:active={$mode === ToolbarMode.MERGE}>Apvienot kļūdas</span> -->
		<button
			class="btn-resub"
			class:active={$mode === ToolbarMode.RESUB}
			on:click={() => { onBtnClick(ToolbarMode.RESUB); }}
		></button>
		<span class:active={$mode === ToolbarMode.RESUB}>Sadalīt kļūdu</span>
		<button
			class="btn-register"
			class:active={$mode === ToolbarMode.REGISTER}
			on:click={() => { onBtnClick(ToolbarMode.REGISTER); }}
		></button>
		<span class:active={$mode === ToolbarMode.REGISTER}>Reģistrēt kļūdas</span>
		<button
			class="btn-register-multi"
			class:active={$mode === ToolbarMode.REGISTER_MULTI}
			on:click={() => { onBtnClick(ToolbarMode.REGISTER_MULTI); }}
		></button>
		<span class:active={$mode === ToolbarMode.REGISTER_MULTI}>Reģistrēt vairākas</span>
	</div>
</div>

<style lang="scss">
	@import "../scss/global.scss";

	$ICON_COUNT: 6;
	$TOOLBAR_ICON_SIZE: clamp(35px, 2.5vw, 200px);
	$TOOLBAR_HEIGHT: calc(#{$TOOLBAR_ICON_SIZE} * #{$ICON_COUNT} * 1.35);

	.outer-container {
		position: relative;
		top: 20px;

		height: $TOOLBAR_HEIGHT;
		width: 0;
		transition-timing-function: ease-in;
		transition: width 0.5s;

		.inner-container {
			width: 0;
		}

		&.active {
			width: calc($TOOLBAR_ICON_SIZE * 1.3);

			.inner-container {
				width: $TOOLBAR_ICON_SIZE;
			}
		}
	}

	.inner-container {
		border: 1px solid $COL_ACCENT;
		border-left: none;
		background-color: $COL_BG_DARK;
		grid-area: "toolbar";
		height: $TOOLBAR_HEIGHT;
		padding: 10%;

		display: grid;
		align-items: center;
		grid-template-columns: auto 1fr;
		row-gap: calc(#{$TOOLBAR_ICON_SIZE} * 0.3);
		overflow-x: hidden;
		
		position: absolute;
		left: 0;
		top: 0;
		z-index: 10;

		transition-timing-function: ease-in;
		transition: width 0.5s;

		&:hover {
			width: calc(#{$TOOLBAR_ICON_SIZE} * 5.5) !important;
		}

		span {
			color: $COL_BGFG_REG;
			font-family: $FONT_HEADING;
			white-space: nowrap;
			font-weight: 400;
			font-size: calc(#{$TOOLBAR_ICON_SIZE} * 0.45);
			margin-left: 0.8em;
			text-transform: uppercase;
			cursor: default;
			user-select: none;
			transition: color 0.3s;

			&.active {
				color: $COL_FG_REG;
				text-decoration: underline;
				text-decoration-thickness: 2px;
				text-underline-offset: 3px;
			}
		}

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

			&.btn-view {
				-webkit-mask-image: url(/icons/icon-view.svg);
				mask-image: url(/icons/icon-view.svg);

				-webkit-mask-size: 100%;
				mask-size: 100%;
			}

			// &.btn-edit {
			// 	-webkit-mask-image: url(/icons/icon-edit.svg);
			// 	mask-image: url(/icons/icon-edit.svg);

			// 	-webkit-mask-size: 80%;
			// 	mask-size: 80%;
			// }

			&.btn-ignore {
				-webkit-mask-image: url(/icons/icon-ignore.svg);
				mask-image: url(/icons/icon-ignore.svg);

				-webkit-mask-size: 100%;
				mask-size: 100%;
			}

			// &.btn-merge {
			// 	-webkit-mask-image: url(/icons/icon-merge.svg);
			// 	mask-image: url(/icons/icon-merge.svg);

			// 	-webkit-mask-size: 90%;
			// 	mask-size: 90%;
			// }

			&.btn-register {
				-webkit-mask-image: url(/icons/icon-register.svg);
				mask-image: url(/icons/icon-register.svg);

				-webkit-mask-size: 95%;
				mask-size: 95%;
			}

			&.btn-resub {
				-webkit-mask-image: url(/icons/icon-resub.svg);
				mask-image: url(/icons/icon-resub.svg);

				-webkit-mask-size: 105%;
				mask-size: 105%;
			}

			&.btn-register-multi {
				-webkit-mask-image: url(/icons/icon-register-multi.svg);
				mask-image: url(/icons/icon-register-multi.svg);

				-webkit-mask-size: 105%;
				mask-size: 105%;
			}
		}
	}
</style>