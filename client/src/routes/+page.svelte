<script lang="ts">
	import EssayBox from "$lib/components/EssayBox.svelte";
	import EssaySelector from "$lib/components/EssaySelector.svelte";
	import MistakeList from "$lib/components/MistakeList.svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import { ActionRegister } from "$lib/ts/ActionRegister";
	import { workspace, mode } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import type { RegisterEntry, RegisterEntryAction } from "$lib/types";
	import DiffONP, { Mistake } from "@shared/diff-engine";
	import { onMount } from "svelte";

	let correctText = "";
	let submissionText = "";
	let diffEssayBox: EssayBox;
	let templateEssayBox: EssayBox;
	let submissionEssayBox: EssayBox;
	let mistakeList: MistakeList;
	let mistakes: Mistake[] = [];
	const actionRegister = new ActionRegister();

	$: if ($workspace !== null) {
		correctText = $workspace.template;
	} else {
		correctText = "";
		submissionText = "";
		diffEssayBox?.setPlainText("");
	}

	async function onSubmissionSelect(ev: CustomEvent) {
		if (!$workspace) {
			console.error("Attempt to load submission text without workspace!");
			return;
		}

		const id: string = ev.detail.entry;
		const text = $workspace!.dataset[id].text!;
// 		submissionText = correctText;
// 		submissionText = `Aivars Eipurs
// Mazsālīto gurķu blūzs
// Noņēmu salocītos dvielīšus no abām burkām, divlitru un vienlitra. Bijīgi, kā saskāries ar paša radītu brīnumu, izņēmu no katras pa gurķītim, garšoja varen labi. Taču par visu pēc kārtas.
// Uz Jāņiem tirgū nopirku it kā mazsālītus gurķus, tomēr tie bija pārāk sāļi. Kad par to darbavietā pastāstīju kolēģei, viņa teica, ka ļoti viegli šādus gurķus pagatavot pašam un ka otrā rītā tos jau varēšot ēst, tikai jānogriežot gurķīšiem abi gali. Burka esot jāizdekorē ar dillēm, mārrutku lapu, upeņu zariņu un ķiploka pusdaiviņām, jāsaliek gurķīši un jāaplej ar verdošu ūdeni, kurā iebērta ēdamkarote cukura un ēdamkarote sāls. Burka jātur bez vāciņa, un tad mazsālītie gurķīši būšot gatavi pa vienu nakti.
// Es gan tos sauktu par viegli skābētiem. Marinētie ir marinētie, tas ir saprotams, bet par robežu starp skābētiem un sālītiem, kur nu vēl mazsālītiem, īstas skaidrības nav.
// Nekad nebiju neko konservējis — ne dārzeņus, ne augļus — ja nu vienīgi kādreiz palīdzējis atvērt kādu burku. Taču izbrīnīju mājiniekus ar savu nodomu, jo pie manis ne viņi, ne es pats šādu saimniekošanas formu nebijām novērojuši.
// Atcerējies par savu nodomu, pēc pāris dienām devos uz tirgu pirkt ingredientus. Iegādājies gurķus, devos tālāk un drīz vien pamanīju arī garo diļļu saišķi. Tas maksājot vienu eiro. Būdams labs fiziognomists, konstatēju, ka pārdevēja ir mīlīga, tātad lieta bija droša. Teica, lai es ņemot arī mārrutka lapu. Tāpat ķiploku. Ķiploks maksājot septiņdesmit centus. Upeņu zariņa gan viņai diemžēl nebija, tomēr par pirkumu paprasīja četrus eiro un septiņdesmit centus. Ne tikvien samaksāju, bet arī pateicos par konsultāciju.
// Kāds idiots esmu, aptvēru tikai tramvajā. Iznāk, ka par mārrutka lapu biju samaksājis trīs eiro. Tā lapa bija liela, taču ne jau tik liela kā palma vai ziloņa auss.
// Nākamajā reizē visu garšaugu komplektu nopirku par vienu eiro, turklāt ar upeņu zariņu. Mārrutka lapa bija gandrīz kā ziloņa auss.`;
		submissionText = text;
		updateDiff();
	}

	async function updateDiff() {
		const diff = new DiffONP(submissionText, correctText);
		diff.calc();
		setMistakes(diff.getMistakes());
	}

	async function setMistakes(newMistakes: Mistake[]) {
		mistakes = newMistakes;

		let registerPromises: Promise<void>[] = [];

		for (const m of mistakes) {
			registerPromises.push(new Promise<void>(async (res) => {
				m.isRegistered = await actionRegister.isMistakeInRegister(m);
				res();
			}));
		}

		await Promise.all(registerPromises);

		mistakeList.set(mistakes);
		diffEssayBox.set(submissionText, mistakes);
	}

	function onMistakeHover(ev: CustomEvent) {
		if (ev.detail.source === "LIST") {
			diffEssayBox.setMistakeHover(ev.detail.id);
		} else {
			mistakeList.setMistakeHover(ev.detail.id);
		}
	}

	function onMistakeHoverOut(ev: CustomEvent) {
		if (ev.detail.source === "LIST") {
			diffEssayBox.clearMistakeHover(ev.detail.id);
		} else {
			mistakeList.clearMistakeHover();
		}
	}

	let prevToolbarMode: ToolbarMode | null = null;

	function onToolbarModeChange(newMode: ToolbarMode) {
		if (prevToolbarMode === ToolbarMode.EDIT) {
			correctText = templateEssayBox.getText();
			submissionText = submissionEssayBox.getText();
			updateDiff();
		}

		prevToolbarMode = newMode;
	}

	$: onToolbarModeChange($mode);

	function onMistakeMerge(ev: CustomEvent) {
		const ids: string[] = ev.detail.ids;
		const newMistakes = [...mistakes];
		
		const mergedMistakes = ids.map((id) => mistakes.find((m) => m.id === id)!);
		const mergedMistake = Mistake.mergeMistakes(...mergedMistakes);

		for (const id of ids) {
			newMistakes.splice(newMistakes.findIndex((m) => m.id === id), 1);
		}

		newMistakes.push(mergedMistake);
		newMistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

		setMistakes(newMistakes);
	}

	async function onMistakeRegister(ev: CustomEvent) {
		const id = ev.detail.id as string;
		const data = ev.detail.data as RegisterEntry;
		const action = ev.detail.action as RegisterEntryAction;
		const mistake: Mistake = mistakes.find((m) => m.id === id)!;

		switch (action) {
			case "ADD":
				await actionRegister.addMistakeToRegister(mistake, data);
				mistake.isRegistered = true;
				break;
			case "EDIT":
				await actionRegister.updateMistakeInRegister(mistake, data);
				mistake.isRegistered = true;
				break;
			case "DELETE":
				await actionRegister.deleteMistakeFromRegister(mistake);
				mistake.isRegistered = false;
				break;
		}

		setMistakes(mistakes);
	}

	onMount(() => {
		if ($workspace !== null) {
			
		}
	});
</script>

<div class="container">
	<Toolbar/>

	<div class="essay-container essay1">
		<h2>Paraugs</h2>
		<div>
			<EssayBox bind:this={templateEssayBox} text={correctText} editable={$mode === ToolbarMode.EDIT}/>
		</div>
	</div>

	<div class="essay-container essay2">
		<h2>Labošana</h2>
		<div>
			<EssayBox bind:this={diffEssayBox} on:hover={onMistakeHover} on:hoverout={onMistakeHoverOut}/>
		</div>
	</div>

	<div class="essay-container essay3">
		<h2>Iesūtītais</h2>
		<div>
			<EssayBox bind:this={submissionEssayBox} text={submissionText} editable={$mode === ToolbarMode.EDIT}/>
		</div>
	</div>

	<div class="info-container">
		<div class="info-selector">
			<EssaySelector on:select={onSubmissionSelect}/>
		</div>
		<div class="info-mistakes">
			<MistakeList
				actionRegister={actionRegister}
				bind:this={mistakeList}
				on:hover={onMistakeHover}
				on:hoverout={onMistakeHoverOut}
				on:merge={onMistakeMerge}
				on:register={onMistakeRegister}
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