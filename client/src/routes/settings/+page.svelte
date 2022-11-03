<script lang="ts">
	import { downloadText, mistakeInRegister } from "$lib/ts/util";
	import store, { type Stores } from "$lib/ts/stores";
	import type { ExportedSubmission, Submission, UUID, Workspace } from "@shared/api-types";
	import { exportSubmission, genURLId } from "$lib/ts/SubmissionExport";
	import { parseDebugWorkspace } from "$lib/ts/networking/DiktifyAPI";
	import VariationSelector from "$lib/components/VariationSelector.svelte";
	import type { MistakeData, MistakeHash } from "@shared/diff-engine";
	import MassMistakeRegistrationModal from "$lib/components/modals/MassMistakeRegistrationModal.svelte";

	const workspace = store("workspace") as Stores["workspace"];
	const localWorkspaceDatabase = store("localWorkspaceDatabase") as Stores["localWorkspaceDatabase"];
	const workspaceCache = store("cache") as Stores["cache"];

	let massRegModal: MassMistakeRegistrationModal;
	let fileImports: FileList;
	let regVariations: {
		ortho: UUID | null,
		space: UUID | null,
		newline: UUID | null
	} = { ortho: null, space: null, newline: null };

	async function exportData() {
		if (!(await $workspace)) return;

		downloadText("dati.json", JSON.stringify(await $workspace));
	}

	async function clearData(){
		const db = await $localWorkspaceDatabase;
		db.clear();
		localStorage.removeItem("activeSubmissionID");

		const cache = await $workspaceCache;
		cache.clearEntireCache();
	}

	async function clearWorkspaceData() {
		clearData();

		location.replace("/");
	}

	async function exportVis() {
		const ws = await $workspace;

		if (!ws) return;

		const submissions = Object.values(ws.submissions as unknown as Record<string, Submission>);
		const submTest = submissions.filter((s) => s.id === "9999");
		const output: Record<string, { id: string, data: ExportedSubmission }> = {};

		for (const subm of submissions) {
			const data = exportSubmission(subm, ws);
			const urlId = genURLId();

			output[urlId] = {
				id: subm.id,
				data
			};
		}

		// console.log(output);
		downloadText("vis_data.json", JSON.stringify(output));
	}

	async function importData() {
		const reader = new FileReader();

		reader.onload = async (ev) => {
			let data: any;

			try {
				data = JSON.parse(ev.target!.result as string);
			} catch (err) {
				console.error(err);
				return;
			}

			// Clear old data
			await clearData();

			// Add new data
			const ws = await parseDebugWorkspace(data);
			await (await $localWorkspaceDatabase).updateWorkspace(ws);

			setTimeout(() => { location.replace("/"); }, 500);
		};

		reader.readAsText(fileImports[0]);
	}

	function isMistakeValidWordMistake(m: MistakeData) {
		if (m.type !== "MIXED") return false;
		if (m.subtype !== "WORD") return false;

		const altSpelling = ["pavasara", "dziļās", "prezbiteriešu"];
		if (altSpelling.includes(m.wordCorrect!.toLocaleLowerCase())) return false;

		if (m.actions.filter((a) => a.char === " ").length > 0) return false;
		if (
			m.word.substring(1) === m.wordCorrect!.substring(1)
			&& m.word[0].toLocaleLowerCase() === m.wordCorrect![0].toLocaleLowerCase()
		) return false;

		return true;
	}

	function getAllUnregisteredMistakes(ws: Workspace) {
		const subms = (Object.values(ws.submissions) as unknown as Submission[])
			.filter((s) => s.state !== "REJECTED" && s.state !== "DONE");
		return subms.flatMap((s) => s.data.mistakes)
			.filter((m) => !mistakeInRegister(m.hash, ws.register));
	}

	function getWordMistakes(ws: Workspace) {
		const mistakes: Record<MistakeHash, MistakeData> = {};
		const allMistakes = getAllUnregisteredMistakes(ws);

		// Remove duplicates and filter out invalid mistakes
		for (const m of allMistakes) {
			if (m.hash in mistakes) continue;
			if (!isMistakeValidWordMistake(m)) continue;

			mistakes[m.hash] = m;
		}

		return mistakes;
	}

	function getSpaceMistakes(ws: Workspace) {
		const allMistakes = getAllUnregisteredMistakes(ws);
		const mistakes: Record<MistakeHash, MistakeData> = {};

		// Remove duplicates and filter out invalid mistakes
		for (const m of allMistakes) {
			if (m.hash in mistakes) continue;
			if (m.word !== " ") continue;

			mistakes[m.hash] = m;
		}

		return mistakes;
	}

	function getNewlineMistakes(ws: Workspace) {
		const allMistakes = getAllUnregisteredMistakes(ws);
		const mistakes: Record<MistakeHash, MistakeData> = {};

		// Remove duplicates and filter out invalid mistakes
		for (const m of allMistakes) {
			if (m.hash in mistakes) continue;
			if (!m.word.includes("\n")) continue;
			if (mistakeInRegister(m.hash, ws.register)) continue;

			mistakes[m.hash] = m;
		}

		return mistakes;
	}

	async function massGrade() {
		const ws = await $workspace;

		if (ws === null) return;
		if (Object.values(regVariations).includes(null)) return;

		const wordMistakes = getWordMistakes(ws);
		const spaceMistakes = getSpaceMistakes(ws);
		const newlineMistakes = getNewlineMistakes(ws);

		const mArr: MistakeData[] = [];

		for (const m of Object.values(getAllUnregisteredMistakes(ws))) {
			if (mArr.filter((cm) => cm.hash === m.hash).length > 0) continue;

			mArr.push(m);
		}

		console.log("Total mistakes: ", mArr.length);
		console.log("Word mistakes: ", Object.keys(wordMistakes).length);
		console.log("Space mistakes: ", Object.keys(spaceMistakes).length);
		console.log("Newline mistakes: ", Object.keys(newlineMistakes).length);

		massRegModal.open({
			ortho: Object.values(wordMistakes),
			space: Object.values(spaceMistakes),
			newline: Object.values(newlineMistakes),
		}, regVariations as { ortho: UUID, space: UUID, newline: UUID });
	}
</script>

<div class="container">
	<div class="btnContainer">
		<button on:click={exportData} disabled={$workspace === null}>Eksportēt datus</button>
		<button on:click={exportVis} disabled={$workspace === null}>Eksportēt vizualizāciju</button>
		<hr>
		<div>
			<label for="fileImport">Importēt datus</label>
			<input type="file" accept=".json" id="fileImport" bind:files={fileImports} on:change={importData}>
		</div>

		<br>
		<hr>
		<button on:click={clearWorkspaceData} disabled={$workspace === null}>Dzēst datus</button>
	</div>
	<div class:hidden={$workspace === null}>
		<h2>Masveida kļūdu reģistrācija</h2>

		<div class="varSelectContainer">
			<span>Izvēlēties pareizrakstības variāciju</span>
			<VariationSelector bind:selected={regVariations.ortho}/>
		</div>
		<div class="varSelectContainer">
			<span>Izvēlēties atstarpes variāciju</span>
			<VariationSelector bind:selected={regVariations.space}/>
		</div>
		<div class="varSelectContainer">
			<span>Izvēlēties rindkopas variāciju</span>
			<VariationSelector bind:selected={regVariations.newline}/>
		</div>

		<span class="warn">Brīdinājums: Pirms labo, eksportē datus!</span>
		<button on:click={massGrade}>Labot</button>
	</div>
</div>

<MassMistakeRegistrationModal bind:this={massRegModal} />

<style lang="scss">
	@import "../../lib/scss/global.scss";

	.container {
		color: $COL_FG_REG;
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 10vh;

		> div {
			padding: 5vh;
		}

		.btnContainer {
			display: flex;
			justify-content: center;
			flex-flow: column;
			row-gap: 3vh;
			border-right: 1px solid $COL_FG_DARK;
		}
		
		button {
			font-size: 5vh;
			width: 40vw;
			padding: 1vh 0;
			cursor: pointer;
		}

		h2 {
			font-weight: 400;
		}

		span {
			font-family: $FONT_BODY;
			display: inline-block;
			margin-bottom: 0.25em;
		}

		.warn {
			color: $COL_ACCENT_AUX;
		}
	}

	.hidden {
		display: none;
	}

	.varSelectContainer {
		padding: 1vh;
		margin-bottom: 1.75vh;
	}
</style>