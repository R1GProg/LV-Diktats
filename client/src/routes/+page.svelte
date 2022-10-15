<script lang="ts">
	import DiffEssayBox from "$lib/components/EssayBox/DiffEssayBox.svelte";
	import EssaySelector from "$lib/components/EssaySelector.svelte";
	import MistakeList from "$lib/components/MistakeList.svelte";
	import SubmissionEssayBox from "$lib/components/EssayBox/SubmissionEssayBox.svelte";
	import TemplateEssayBox from "$lib/components/EssayBox/TemplateEssayBox.svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import Visualizer from "$lib/components/Visualizer.svelte";
	import SubmissionStatusIndicator from "$lib/components/SubmissionStatusIndicator.svelte";

	const mode = store("mode") as Stores["mode"];
</script>

<div class="container">
	<Toolbar/>

	<div class="essay-container essay1">
		<h2>Paraugs</h2>
		<div><TemplateEssayBox/></div>
	</div>

	<div class="essay-container essay2">
		<div class="essay-container-head">
			<h2>Labošana</h2>
			<div><SubmissionStatusIndicator/></div>
		</div>
		<div>
			{#if $mode === ToolbarMode.VIEW}
			<Visualizer/>
			{:else}
			<DiffEssayBox/>
			{/if}
		</div>
	</div>

	<div class="essay-container essay3">
		<h2>Iesūtītais</h2>
		<div><SubmissionEssayBox/></div>
	</div>

	<div class="info-container">
		<div class="info-selector">
			<EssaySelector/>
		</div>
		<div class="info-mistakes">
			<MistakeList/>
		</div>
	</div>
</div>

<style lang="scss">
	@import "../lib/scss/global.scss";

	$CONTENT_HEIGHT: calc(95vh - #{$HEADER-HEIGHT} - 1vw);

	.container {
		display: grid;
		grid-template-areas: "toolbar essay1 essay2 essay3 info";
		grid-template-columns: auto 1fr 1fr 1fr $INFO_WIDTH;
		column-gap: 1vw;
		padding-top: 7vh;
		height: $CONTENT_HEIGHT;
		overflow: hidden;
	}

	.essay-container {
		position: relative;
		height: 100%;

		>div {
			height: calc(#{$CONTENT_HEIGHT} - 10px);
			overflow: hidden;
			padding-bottom: 10px;
		}

		h2 {
			color: $COL_FG_REG;
			text-transform: uppercase;
			font-weight: 400;
			margin: 0;
			font-size: 2.25rem;
			position: absolute;
			top: calc(-1em - 5px);
		}

		.essay-container-head {
			display: flex;
			flex-direction: row;
			position: absolute;
			font-size: 2.25rem;
			top: calc(-1em - 5px);
			width: 100%;

			div {
				width: 100%;
			}

			h2 {
				position: static;
			}
		}

		&.essay1 {
			grid-area: essay1;
		}

		&.essay2 {
			grid-area: essay2;
		}

		&.essay3 {
			grid-area: essay3;
		}
	}

	.info-container {
		grid-area: info;

		width: $INFO_WIDTH;
		height: calc(100vh - $HEADER_HEIGHT - 1px - 2vh);
		background-color: $COL_BG_DARK;
		// position: absolute;
		margin-right: 0;
		margin-top: -7.1vh; // TODO: Temporary?
		// top: $HEADER_HEIGHT;
		// right: 0;
		border-top: 1px solid $COL_ACCENT;
		border-left: 1px solid $COL_ACCENT;

		padding-top: 2vh;

		display: grid;
		grid-template-areas: "selector" "mistakes";
		grid-template-rows: 28vh calc(72vh - $HEADER_HEIGHT - 1px - 2vh);
	}

	.info-selector {
		grid-area: selector;
	}
	
	.info-mistakes {
		grid-area: mistakes;
	}
</style>