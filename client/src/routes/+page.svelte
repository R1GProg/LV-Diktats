<script lang="ts">
	import DiffEssayBox from "$lib/components/EssayBox/DiffEssayBox.svelte";
	import EssaySelector from "$lib/components/EssaySelector.svelte";
	import MistakeList from "$lib/components/MistakeList.svelte";
	import SubmissionEssayBox from "$lib/components/EssayBox/SubmissionEssayBox.svelte";
	import TemplateEssayBox from "$lib/components/EssayBox/TemplateEssayBox.svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import { ActionRegister } from "$lib/ts/ActionRegister";

	const actionRegister = new ActionRegister();
</script>

<div class="container">
	<Toolbar/>

	<div class="essay-container essay1">
		<h2>Paraugs</h2>
		<div><TemplateEssayBox/></div>
	</div>

	<div class="essay-container essay2">
		<h2>Labošana</h2>
		<div><DiffEssayBox/></div>
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
			<MistakeList
				actionRegister={actionRegister}
			/>
		</div>
	</div>
</div>

<style lang="scss">
	@import "../lib/scss/global.scss";

	$CONTENT_HEIGHT: calc(92vh - #{$HEADER-HEIGHT} - 1vw);

	.container {
		display: grid;
		grid-template-areas: "toolbar essay1 essay2 essay3 info";
		grid-template-columns: auto 1fr 1fr 1fr $INFO_WIDTH;
		column-gap: 1vw;
		padding-top: 8vh;
		height: $CONTENT_HEIGHT;
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
			position: absolute;
			top: calc(-1em - 5px);
			font-size: 2.25rem;
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
		margin-top: -8.1vh; // TODO: Temporary?
		// top: $HEADER_HEIGHT;
		// right: 0;
		border-top: 1px solid $COL_ACCENT;
		border-left: 1px solid $COL_ACCENT;

		padding-top: 2vh;

		display: grid;
		grid-template-areas: "selector" "mistakes";
		grid-template-rows: 20vh calc(80vh - $HEADER_HEIGHT - 1px - 2vh);
	}

	.info-selector {
		grid-area: selector;
	}
	
	.info-mistakes {
		grid-area: mistakes;
	}
</style>