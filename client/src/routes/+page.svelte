<script lang="ts">
	import EssayBox from "$lib/components/EssayBox.svelte";
	import EssaySelector from "$lib/components/EssaySelector.svelte";
	import MistakeList from "$lib/components/MistakeList.svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import { workspace } from "$lib/ts/stores";

	let correctText = "";
	let diffText = "";
	let submissionText = "";

	$: if ($workspace !== null) {
		correctText = $workspace.template;
	} else {
		correctText = "";
		diffText = "";
		submissionText = "";
	}

	function onSubmissionSelect(ev: CustomEvent) {
		if (!$workspace) {
			console.error("Attempt to load submission text without workspace!");
			return;
		}

		const id: string = ev.detail.entry;
		const text = $workspace!.dataset[id].text!;
		submissionText = text;
		diffText = text;
	}
</script>

<div class="container">
	<Toolbar/>

	<div class="essay-container essay1">
		<h2>Paraugs</h2>
		<div>
			<EssayBox text={correctText}/>
		</div>
	</div>

	<div class="essay-container essay2">
		<h2>Labošana</h2>
		<div>
			<EssayBox text={diffText}/>
		</div>
	</div>

	<div class="essay-container essay3">
		<h2>Iesūtītais</h2>
		<div>
			<EssayBox text={submissionText}/>
		</div>
	</div>

	<div class="info-container">
		<div class="info-selector">
			<EssaySelector on:select={onSubmissionSelect}/>
		</div>
		<div class="info-mistakes">
			<MistakeList/>
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
		position: absolute;
		top: $HEADER_HEIGHT;
		right: 0;
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