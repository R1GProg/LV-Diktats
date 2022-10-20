<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import type { MistakeId, MistakeData } from "@shared/diff-engine";
	import MistakeRegistrationModal from "$lib/components/modals/MistakeRegistrationModal.svelte";
	import type { RegisterEntry, Submission, Workspace } from "@shared/api-types";
	import { getRegisterId, mistakeInRegister } from "$lib/ts/util";
	import type MistakeSelection from "$lib/ts/MistakeSelection";
	import ProcessingStatus from "./modals/status/ProcessingStatus.svelte";

	const mode = store("mode") as Stores["mode"];
	const hideRegistered = store("hideRegistered") as Stores["hideRegistered"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const hoveredMistake = store("hoveredMistake") as Stores["hoveredMistake"];
	const ds = store("ds") as Stores["ds"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const workspace = store("workspace") as Stores["workspace"];
	const selectedMistakes = store("selectedMistakes") as Stores["selectedMistakes"];
	
	let mistakes: MistakeData[] = [];
	let register: RegisterEntry[] = [];

	let listContainer: HTMLElement;
	let regModal: MistakeRegistrationModal;
	let processingModal: ProcessingStatus;

	function countRegisteredMistakes(mArr: MistakeData[]) {
		return mArr.filter((m) => mistakeInRegister(m.hash, register)).length;
	}

	async function onMistakeHover(ev: Event) {
		const target = ev.currentTarget as HTMLElement;
		const id = target.dataset.id!;
		$hoveredMistake = id;
	}

	function onMistakeHoverOut(ev: Event) {
		$hoveredMistake = null;
	}

	async function onMistakeClick(ev: Event) {
		if ($mode !== ToolbarMode.REGISTER && $mode !== ToolbarMode.RESUB) return;

		const id = (ev.currentTarget as HTMLElement).dataset.id!;
		$selectedMistakes.toggle(id);
	}

	function splitMistake(id: MistakeId) {
		if (!$activeSubmissionID || !$activeWorkspaceID) return;

		const m = mistakes.find((cm) => cm.id === id);
		
		if (!m) return;
		if (m.subtype === "MERGED") return;

		if (m.type !== "MIXED") {
			if (m.splitFrom) {
				$ds.unsplitMixedMistake(m.splitFrom, $activeSubmissionID, $activeWorkspaceID);
			}
			
			return;
		}

		$ds.splitMixedMistake(id, $activeSubmissionID, $activeWorkspaceID);
	}

	function onMistakeSelectionChange(selection: MistakeSelection) {
		if (selection.size() > 0) {
			const selEls = selection.get();
			const firstID = selEls[selEls.length - 1];
			const targetScrollEl = listContainer.querySelector(`[data-id="${firstID}"]`)!;
			targetScrollEl.scrollIntoView({ behavior: "smooth" });
		}

		if (selection.size() === 1 && $mode === ToolbarMode.RESUB) {
			splitMistake(selection.get()[0]);
			selection.clear();

			return;
		} else if (selection.size() !== 1) {
			return;
		}
		
		const selID = selection.get()[0];
		const selMistake = mistakes.find((m) => m.id === selID)!;

		if (!mistakeInRegister(selMistake.hash, register)) return;

		mistakeRegisterHandler(selID);
	}

	async function mistakeRegisterHandler(id: MistakeId) {
		if ($mode !== ToolbarMode.REGISTER) return;

		const activeSubm = await $activeSubmission;
		const ws = await $workspace;

		if (activeSubm === null || ws === null) return;

		const mHash = activeSubm.data.mistakes.find((m) => m.id === id)!.hash;
		const regId = getRegisterId(mHash, register);
		const regEntry = ws.register.find((r) => r.id === regId)!;

		try {
			const data = await regModal.open(mHash, regId ? "EDIT" : "ADD", regId);
		
			switch (data.action) {
				case "ADD":
					await $ds.registerNew(data, $activeWorkspaceID!);
					break;
				case "ADD_VARIATION":
					await $ds.registerUpdate(data, $activeWorkspaceID!);
					break;
				case "EDIT":
					await $ds.registerUpdate(data, $activeWorkspaceID!);
					break;
				case "DELETE":
					if (regEntry.mistakes.length === 1) {
						await $ds.registerDelete(data, $activeWorkspaceID!);
					} else {
						const regMistakes = [...regEntry.mistakes];
						regMistakes.splice(regMistakes.findIndex((m) => m === mHash), 1);

						await $ds.registerUpdate({
							id: regEntry.id,
							mistakes: regMistakes,
							description: regEntry.description,
							opts: regEntry.opts,
							action: "EDIT",
						}, $activeWorkspaceID!);
					}
					break;
			}
		} catch(err) {
			console.warn(err);
		} finally {
			$selectedMistakes.clear();
		}
	}

	async function mistakeUnmergeHandler(id: MistakeId) {
		if ($mode !== ToolbarMode.REGISTER) return;

		const mistake = mistakes.find((m) => m.id === id);

		if (!mistake || mistake.subtype !== "MERGED") return;

		const unmergePromise = $ds.mistakeUnmerge(mistake.hash, $activeWorkspaceID!);
		processingModal.open(unmergePromise);
	}

	async function onBodyKeypress(ev: KeyboardEvent) {
		if ($mode !== ToolbarMode.REGISTER) return;
		if ($selectedMistakes.size() === 0) return;

		if (ev.key === "Escape") {
			$selectedMistakes.clear();

			const textSelection = document.getSelection();

			if (textSelection !== null) {
				textSelection.removeAllRanges();
			}

			return;
		}

		if (ev.key !== "Enter") return;

		let id: string = $selectedMistakes.get()[0];

		if ($selectedMistakes.size() !== 1) {
			const hashes = $selectedMistakes.get().map((id) => mistakes.find((m) => m.id === id)?.hash);

			const mergePromise = $ds.mistakeMerge(hashes.filter((h) => h !== undefined) as string[], $activeWorkspaceID!);

			processingModal.open(mergePromise);
			const submIds = await mergePromise;

			if (submIds === null) return;

			const subm = await $activeSubmission;
			
			if (subm === null) return;

			const mergedMistake = subm.data.mistakes.find((m) => {
				if (m.subtype !== "MERGED") return false;

				const childHashes = m.children.map((c) => c.hash);
				
				if (childHashes.length !== hashes.length) return false;

				return childHashes.every((h) => hashes.includes(h));
			});

			if (!mergedMistake) {
				console.warn(`Unable to find merged mistake to register (${hashes.join(", ")})`);
				return;
			}

			id = mergedMistake.id;
		}

		mistakeRegisterHandler(id);
		$selectedMistakes.clear();
	}

	async function onSubmissionChange(submissionPromise: Promise<Submission | null> | null) {
		if (submissionPromise === null) {
			mistakes = [];
			return;
		}

		const submission = await submissionPromise;

		if (submission === null) {
			mistakes = [];
			return;
		}

		mistakes = submission.data!.mistakes;
	}

	async function onWorkspaceChange(workspacePromise: Promise<Workspace> | null) {
		const ws = await workspacePromise;

		if (ws === null) {
			register = [];
			return;
		}

		register = ws.register;
	}

	$: onMistakeSelectionChange($selectedMistakes);
	$: onSubmissionChange($activeSubmission);
	$: onWorkspaceChange($workspace);
	$: if ($mode !== ToolbarMode.REGISTER && $mode !== ToolbarMode.RESUB) $selectedMistakes.clear();
</script>

<svelte:body on:keydown={onBodyKeypress}/>

<div class="container">
	<div class="list" bind:this={listContainer}>
		{#each mistakes as m}
			{@const mInReg = mistakeInRegister(m.hash, register)}
			{@const word = m.word === " " ? `< >` : (m.word === "\n" ? "\\n" : m.word)}
			<div
				data-id={m.id}
				class="mistake {m.type} {m.subtype}"
				class:split={m.splitFrom}
				class:hover={$hoveredMistake === m.id}
				class:merging={$selectedMistakes.has(m.id)}
				class:registered={mInReg}
				class:hidden={mInReg && $hideRegistered}
				on:mouseenter={onMistakeHover}
				on:focus={onMistakeHover}
				on:mouseleave={onMistakeHoverOut}
				on:blur={onMistakeHoverOut}
				on:click={onMistakeClick}
				title={JSON.stringify({
					boundsCheck: m.boundsCheck,
					boundsCorrect: m.boundsCorrect,
					boundsDiff: m.boundsDiff,
					mType: m.subtype,
					hash: m.hash,
					word: m.word,
					wordCorrect: m.wordCorrect,
					splitFrom: m.splitFrom
				}, null, 2)}
			>
				
				<span class="mistake-target">
					{word.length > 30 ? word.substring(0, 30) : word}
				</span>

				{#if m.subtype === "MERGED"}
					<div class="mistake-icon mistake-icon-merged" on:click|stopPropagation={() => { mistakeUnmergeHandler(m.id); }}></div>
				{:else if m.splitFrom}
					<div class="mistake-icon mistake-icon-split"></div>
				{/if}
			</div>
		{/each}
	</div>
	<div class="list-footer">
		<div class="footer-visibility">
			<input type="checkbox" id="listHideRegistered" title="Slēpt atpazītās kļūdas" bind:checked={$hideRegistered}>
			<label for="listHideRegistered" title="Slēpt atpazītās kļūdas">slēpt atpazītās</label>
		</div>
		<span class="footer-mistakes">{mistakes.length} ({countRegisteredMistakes(mistakes)}) kļūdas</span>
	</div>
</div>

<MistakeRegistrationModal bind:this={regModal} />
<ProcessingStatus bind:this={processingModal} />

<style lang="scss">
	@import "../scss/global.scss";

	.container {
		width: 100%;
		height: calc(100% - 1px); // Accounts for the border
		border-top: 1px solid $COL_ACCENT;
		display: grid;
		grid-template-rows: 1fr auto;
		position: relative;
	}

	.mistake-icon {
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-size: cover;
		mask-repeat: no-repeat;
		mask-size: cover;

		mask-position: 50% 50%;
		-webkit-mask-position: 50% 50%;

		background-color: $COL_BG_LIGHT;
		opacity: 0.35;
		width: 100%;
		height: 100%;

		&.mistake-icon-merged {
			-webkit-mask-image: url(/icons/icon-merge.svg);
			mask-image: url(/icons/icon-merge.svg);

			-webkit-mask-size: 50%;
			mask-size: 50%;

			transition: background-color 0.3s, opacity 0.3s;

			&:hover {
				background-color: $COL_SUBM_REJECTED;
				opacity: 1;
			}
		}

		&.mistake-icon-split {
			-webkit-mask-image: url(/icons/icon-resub.svg);
			mask-image: url(/icons/icon-resub.svg);

			-webkit-mask-size: 75%;
			mask-size: 75%;
		}
	}

	.list-footer {
		border-top: 1px solid $COL_ACCENT;
		font-family: $FONT_HEADING;
		color: $COL_FG_DARK;
		background-color: $COL_BG_REG;
		padding: 5px;
		font-size: 0.85rem;
		align-items: center;

		height: calc(1em + 5px);
		width: calc(100% - 10px);
		position: absolute;
		bottom: 0;

		display: grid;
		grid-template-areas: "visibility mistakes";

		white-space: nowrap;

		.footer-visibility {
			grid-area: visibility;
			display: flex;
			align-items: center;
			
			* {
				cursor: pointer;
				user-select: none;
			}

			input {
				margin-right: 0.35em;
			}
		}

		.footer-mistakes {
			grid-area: mistakes;
			text-align: right;
		}
	}

	.list {
		display: flex;
		flex-flow: column;
		row-gap: 2px;
		padding: 5%;
		padding-bottom: 3rem; // Roughly account for footer
		
		@include scrollbar;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.mistake {
		width: 100%;
		// height: 2.25em;
		text-align: center;
		font-family: $FONT_BODY;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		// white-space: nowrap;

		&:not(.registered) {
			@include hover_filter;
		}

		&.hover {
			filter: brightness(70%);

			.mistake-icon-merged {
				-webkit-mask-image: url(/icons/icon-merge-cancel.svg);
				mask-image: url(/icons/icon-merge-cancel.svg);
			}
		}

		span {
			font-size: 1em;
			color: black;
		}

		.mistake-target {
			color: white;
			font-size: 1.5em;
		}

		&.DEL {
			background-color: $COL_MISTAKE_DEL;
		}

		&.ADD {
			background-color: $COL_MISTAKE_ADD;
		}

		&.MIXED {
			background-color: $COL_MISTAKE_MIXED;
		}

		&.registered {
			filter: brightness(35%);
			
			@include hover_filter(50%);
		}

		&.merging {
			outline: 1px solid yellow;
			box-shadow: inset 0px 0px 5px 2px yellow;
			z-index: 5;
		}

		&.hidden {
			display: none !important;
		}

		&.MERGED, &.split {
			display: grid;
			grid-template-columns: 80% 20%;
			text-align: center;
		}
	}
</style>