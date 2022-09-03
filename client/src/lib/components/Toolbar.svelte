<script lang="ts">
	let mode = 0;

	function onBtnClick(newMode: number) {
		mode = newMode;
	}
</script>

<div>
	<button class="btn-read" class:active={mode === 0} on:click={() => { onBtnClick(0); }}></button>
	<button class="btn-edit" class:active={mode === 1} on:click={() => { onBtnClick(1); }}></button>
	<button class="btn-merge" class:active={mode === 2} on:click={() => { onBtnClick(2); }}></button>
	<button class="btn-register" class:active={mode === 3} on:click={() => { onBtnClick(3); }}></button>
</div>

<style lang="scss">
	@import "../scss/global.scss";

	$TOOLBAR_ICON_SIZE: 3vw;

	div {
		border: 1px solid black;
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