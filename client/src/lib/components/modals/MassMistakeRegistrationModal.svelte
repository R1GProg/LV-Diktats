<script lang="ts">
	import type { MistakeData } from "@shared/diff-engine";
	import Modal from "./Modal.svelte";

	type FilteredMistakeData = {
		ortho: MistakeData[],
		space: MistakeData[],
		newline: MistakeData[]
	};

	let modal: Modal;
	let activeType: keyof FilteredMistakeData = "ortho";
	let unmarkedCount = 0;

	let mistakes: FilteredMistakeData = { ortho: [], space: [], newline: [] };

	export function open(mList: FilteredMistakeData) {
		modal.open();
		mistakes = mList;

		mistakes.ortho.sort((a, b) => b.actions.length - a.actions.length);
		mistakes.space.sort((a, b) => b.actions.length - a.actions.length);
		mistakes.newline.sort((a, b) => b.actions.length - a.actions.length);

		unmarkedCount = countMarked("ortho");
	}

	function shouldUnmark(m: MistakeData) {
		return m.actions.length / 2 > 0.5 * m.wordCorrect!.length;
	}

	function countMarked(type: keyof FilteredMistakeData) {
		return mistakes[type]?.filter((m) => !shouldUnmark(m))?.length ?? 0;
	}

	function onEntryClick(e: MouseEvent) {
		if ((e.target as HTMLElement).tagName === "INPUT") return;

		const el = e.currentTarget! as HTMLElement;
		const cb = el.querySelector<HTMLInputElement>("input[type='checkbox']")!;

		cb.checked = !cb.checked;
	}
</script>

<Modal title={"Masveida reģistrācija"} userClose={true} bind:this={modal}>
	<div class="content-container">
		<div class="header">
			<div class="header-labels">
				<span>Nepareizais vārds</span>
				<span>Pareizais vārds</span>
				<span>Distance</span>
				<span>Reģistrēt?</span>
			</div>

			<div class="header-info">
				<span>Kopā: {mistakes[activeType].length}, atzīmēti: {unmarkedCount}</span>
			</div>

			<div class="selector">
				<select bind:value={activeType}>
					<option value="ortho">Vārda pareizrakstība</option>
					<!-- <option value="space">Atstarpes</option>
					<option value="newline">Jaunas rindkopas</option> -->
				</select>
			</div>
		</div>
		<div class="content">
			{#each mistakes[activeType] as m}
			{@const autounmark = shouldUnmark(m)}
			<div class="content-entry" on:click={onEntryClick}>
				<span class:warn={autounmark}>{m.word}</span>
				<span>{m.wordCorrect}</span>
				<span>{m.actions.length}</span>
				<input type="checkbox" checked={!autounmark}>
			</div>
			{/each}
		</div>
	</div>
</Modal>

<style lang="scss">
	@import "../../scss/global.scss";

	.content-container {
		width: 80vw;
		height: 80vh;

		display: grid;
		grid-template-areas: "head" "content";
		grid-template-rows: auto 1fr;
	}

	.header {
		height: 4vh;
		padding-bottom: 2vh;
		border-bottom: 1px solid $COL_FG_DARK;
		font-family: $FONT_HEADING;
		font-size: 1.25rem;

		display: grid;
		grid-template-columns: 1fr auto 10em;
		grid-template-areas: "labels info selector"
	}

	.selector {
		grid-area: selector;
		@include dropdown($HEADER_HEIGHT);
	}

	.header-labels {
		grid-area: labels;
		display: grid;
		grid-template-columns: 15vw 15vw 10vw 7.5vw;
		align-items: center;
		justify-content: flex-start;
		padding-left: 1vw;
	}

	.header-info {
		grid-area: info;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 1em;
		font-size: 0.85em;
	}

	.content {
		@include scrollbar;

		display: grid;
		grid-auto-flow: row;
		height: calc(100% - 0.5vw);
		overflow-y: auto;
		padding-left: 1vw;
		padding-top: 1vw;
	}

	.content-entry {
		display: grid;
		grid-template-columns: 15vw 15vw 10vw 7.5vw auto;
		width: calc(100% - 4px);
		font-family: $FONT_BODY;
		transition: background-color 0.3s;
		padding: 2px;
		cursor: pointer;

		span {
			display: inline-block;
			// padding-left: 2em;
		}

		&:hover {
			background-color: $COL_BG_LIGHT;
		}
	}

	.warn {
		color: $COL_ACCENT_AUX;
	}
</style>