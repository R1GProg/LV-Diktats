<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import type { RegisterEntry, RegisterUpdateEventType, UUID, Workspace } from "@shared/api-types";
	import type { MistakeData, MistakeHash } from "@shared/diff-engine";
	import Modal from "./Modal.svelte";

	const workspace = store("workspace") as Stores["workspace"];
	const ds = store("ds") as Stores["ds"];

	type MistakeClass = { data: MistakeData, checked: boolean }
	type FilteredMistakeData = {
		ortho: MistakeClass[],
		space: MistakeClass[],
		newline: MistakeClass[]
	};
	type VariationIDs = { ortho: UUID, space: UUID, newline: UUID };

	let modal: Modal;
	let activeType: keyof FilteredMistakeData = "ortho";
	let unmarkedCount = 0;

	let mistakes: FilteredMistakeData = { ortho: [], space: [], newline: [] };
	let variationIDs: VariationIDs;

	export function open(
		mList: { ortho: MistakeData[], space: MistakeData[], newline: MistakeData[] },
		variations: VariationIDs
	) {
		modal.open();

		variationIDs = variations;

		mistakes.ortho = mList.ortho.map((m) => ({ data: m, checked: !shouldUnmark(m) }));
		mistakes.space = mList.space.map((m) => ({ data: m, checked: !shouldUnmark(m) }));
		mistakes.newline = mList.newline.map((m) => ({ data: m, checked: !shouldUnmark(m) }));

		mistakes.ortho.sort((a, b) => calcDistance(b.data) - calcDistance(a.data));
		mistakes.space.sort((a, b) => calcDistance(b.data) - calcDistance(a.data));
		mistakes.newline.sort((a, b) => calcDistance(b.data) - calcDistance(a.data));

		unmarkedCount = countMarked("ortho");
	}

	function calcDistance(m: MistakeData) {
		const targetLength = m.wordCorrect ? m.wordCorrect.length : m.word.length;

		return (m.actions.length / 2) / targetLength;
	}

	function shouldUnmark(m: MistakeData) {
		return calcDistance(m) > 0.5;
	}

	function countMarked(type: keyof FilteredMistakeData) {
		return mistakes[type].filter((m) => m.checked).length;
	}

	function onEntryClick(e: MouseEvent, m: MistakeClass) {
		if ((e.target as HTMLElement).tagName === "INPUT") return;

		const el = e.currentTarget! as HTMLElement;
		const cb = el.querySelector<HTMLInputElement>("input[type='checkbox']")!;

		cb.checked = !cb.checked;
		onCheckChange(cb, m);
	}

	function getSelectedWordMistakes() {
		return mistakes.ortho.filter((m) => m.checked);
	}

	function onCheckChange(el: HTMLInputElement, m: MistakeClass) {
		m.checked = el.checked;
		mistakes[activeType] = mistakes[activeType];
	}

	function genRegManyMistakeData(ws: Workspace, id: UUID, hashes: MistakeHash[]) {
		const reg = ws.register.find((r) => r.id === id)!;
		const editData = {
			id: reg.id,
			mistakes: [ ...reg.mistakes, ...hashes ],
			description: reg.description,
			opts: reg.opts,
			action: "ADD_VARIATION" as RegisterUpdateEventType,
		};

		return editData
	}

	async function confirmRegistration() {
		const ws = await $workspace;

		if (ws === null) return;

		const wordMistakeHashes = getSelectedWordMistakes().map((m) => m.data.hash);
		const spaceMistakeHashes = mistakes.space.map((m) => m.data.hash);
		const newlineMistakeHashes = mistakes.newline.map((m) => m.data.hash);

		await $ds.registerUpdate(genRegManyMistakeData(ws, variationIDs.ortho, wordMistakeHashes), ws.id);
		await $ds.registerUpdate(genRegManyMistakeData(ws, variationIDs.space, spaceMistakeHashes), ws.id);
		await $ds.registerUpdate(genRegManyMistakeData(ws, variationIDs.newline, newlineMistakeHashes), ws.id);

		modal.close();
	}
</script>

<Modal title={"Masveida reģistrācija"} userClose={true} bind:this={modal}>
	<div class="content-container">
		<div class="header">
			<div class="header-labels">
				<span>N.p.k.</span>
				<span>Nepareizais vārds</span>
				<span>Pareizais vārds</span>
				<span class="content-center">Distance</span>
				<span class="content-center">Reģistrēt?</span>
			</div>

			<div class="header-info">
				<span class="content-center">Kopā: {mistakes[activeType].length}, atzīmēti: {unmarkedCount}</span>
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
			{#each mistakes[activeType] as m, i (m.data.id)}
			<div class="content-entry" on:click={(ev) => { onEntryClick(ev, m); }}>
				<span>{i + 1}</span>
				<span class:warn={!m.checked}>{m.data.word}</span>
				<span>{m.data.wordCorrect}</span>
				<span class="content-center">{calcDistance(m.data).toFixed(2)}</span>
				<input type="checkbox" checked={m.checked} on:change={(ev) => { onCheckChange(ev.currentTarget, m); }}>
			</div>
			{/each}
		</div>
		<div class="footer">
			<button on:click={confirmRegistration}>Apstiprināt labojumu</button>
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
		grid-template-columns: 4vw 15vw 15vw 10vw 7.5vw;
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
		grid-template-columns: 4vw 15vw 15vw 10vw 7.5vw auto;
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

	.content-center {
		text-align: center;
	}

	.footer {
		position: fixed;
		bottom: 7.5vh;
		left: calc(100% - 27.5vw);
		width: 100%;

		button {
			height: 5vh;
			width: 15vw;
			cursor: pointer;
			background-color: $COL_BG_LIGHT;
			border: 1px solid $COL_FG_DARK;
			color: $COL_FG_REG;
			transition: color 0.3s, border-color 0.3s;
			font-family: $FONT_HEADING;
			font-size: 2.5vh;

			&:hover {
				color: $COL_ACCENT_AUX;
				border-color: $COL_ACCENT_AUX;
			}
		}
	}

	.warn {
		color: $COL_ACCENT_AUX;
	}
</style>