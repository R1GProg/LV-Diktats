<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import type { MistakeId, MistakeData } from "@shared/diff-engine";
	import MistakeRegistrationModal from "$lib/components/modals/MistakeRegistrationModal.svelte";
	import type { RegisterEntry, Submission, Workspace } from "@shared/api-types";
	import { getRegisterId, mistakeInRegister } from "$lib/ts/util";
	import type MistakeSelection from "$lib/ts/MistakeSelection";

	const mode = store("mode") as Stores["mode"];
	const hideRegistered = store("hideRegistered") as Stores["hideRegistered"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const hoveredMistake = store("hoveredMistake") as Stores["hoveredMistake"];
	const ds = store("ds") as Stores["ds"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const workspace = store("workspace") as Stores["workspace"];
	const selectedMistakes = store("selectedMistakes") as Stores["selectedMistakes"];
	
	let mistakes: MistakeData[] = [];
	let register: RegisterEntry[] = [];

	let listContainer: HTMLElement;
	let regModal: MistakeRegistrationModal;

	async function onMistakeHover(ev: Event) {
		const target = ev.currentTarget as HTMLElement;
		const id = target.dataset.id!;
		$hoveredMistake = id;
	}

	function onMistakeHoverOut(ev: Event) {
		const target = ev.currentTarget as HTMLElement;
		const id = target.dataset.id!;
		$hoveredMistake = null;
	}

	async function onMistakeClick(ev: Event) {
		const id = (ev.currentTarget as HTMLElement).dataset.id!;
		$selectedMistakes.toggle(id);
	}

	async function onMistakeSelectionChange(mistakeSelection: MistakeSelection) {
		const selection = mistakeSelection.get();

		if ($mode !== ToolbarMode.REGISTER) return;
		if (selection.length === 0) return;
		
		const id = selection[0];
		const mHash = mistakes.find((m) => m.id === id)!.hash;
		const regId = getRegisterId(mHash, register);

		try {
			const data = await regModal.open(mHash, regId ? "EDIT" : "ADD", regId);
		
			switch (data.action) {
				case "ADD":
					if (data.id) {
						// Added to existing
						await $ds.registerUpdate(data, $activeWorkspaceID!);
					} else {
						await $ds.registerNew(data, $activeWorkspaceID!);
					}
					break;
				case "EDIT":
					await $ds.registerUpdate(data, $activeWorkspaceID!);
					break;
				case "DELETE":
					await $ds.registerDelete(data, $activeWorkspaceID!);
					break;
			}
		} catch(err) {} finally {
			$selectedMistakes.clear();
		}
	}

	$: onMistakeSelectionChange($selectedMistakes);

	async function onMistakeRightClick(ev: Event) {
		if ($mode !== ToolbarMode.MERGE) return;

		const id = (ev.currentTarget as HTMLElement).dataset.id!;
		const mistake = mistakes.find((m) => m.id === id);

		if (!mistake || mistake.subtype !== "MERGED") return;

		$ds.mistakeUnmerge(mistake.hash, $activeWorkspaceID!);
	}

	async function onBodyKeypress(ev: KeyboardEvent) {
		if (ev.key !== "Enter") return;
		if ($mode !== ToolbarMode.MERGE) return;
		if ($selectedMistakes.size() <= 1) return;

		const hashes = $selectedMistakes.get().map((id) => mistakes.find((m) => m.id === id)?.hash);
		// console.log(hashes);
		await $ds.mistakeMerge(hashes.filter((h) => h !== undefined) as string[], $activeWorkspaceID!);

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

	$: onSubmissionChange($activeSubmission);
	$: onWorkspaceChange($workspace);
</script>

<svelte:body on:keypress={onBodyKeypress}/>

<div class="container">
	<div class="list" bind:this={listContainer}>
		{#each mistakes as m}
			{@const mInReg = mistakeInRegister(m.hash, register)}
			<div
				data-id={m.id}
				class="mistake {m.type}"
				class:hover={$hoveredMistake === m.id}
				class:merging={$selectedMistakes.has(m.id)}
				class:registered={mInReg}
				class:hidden={mInReg && $hideRegistered}
				on:mouseenter={onMistakeHover}
				on:focus={onMistakeHover}
				on:mouseleave={onMistakeHoverOut}
				on:blur={onMistakeHoverOut}
				on:click={onMistakeClick}
				on:contextmenu|preventDefault={onMistakeRightClick}
				title={JSON.stringify({
					boundsCheck: m.boundsCheck,
					boundsCorrect: m.boundsCorrect,
					boundsDiff: m.boundsDiff,
					mType: m.subtype,
					hash: m.hash,
					word: m.word
				}, null, 2)}
			>

				<!-- <span>konservējis</span> -->
				<span class="mistake-target">
					{m.word === " " ? `< >` : (m.word === "\n" ? "\\n" : m.word)}
				</span>
				<!-- <span>ne dārzeņus</span> -->
			</div>
		{/each}
	</div>
	<div class="list-footer">
		<div class="footer-visibility">
			<input type="checkbox" id="listHideRegistered" title="Slēpt atpazītās kļūdas" bind:checked={$hideRegistered}>
			<label for="listHideRegistered" title="Slēpt atpazītās kļūdas">slēpt atpazītās</label>
		</div>
		<!-- TODO: <NumLength> (<NumRecognized>) kļūdas -->
		<span class="footer-mistakes">{mistakes.length} kļūdas</span>
	</div>
</div>

<MistakeRegistrationModal bind:this={regModal} />

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
			display: none;
		}
	}
</style>