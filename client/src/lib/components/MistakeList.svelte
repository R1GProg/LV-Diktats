<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import type { MistakeId, MistakeData } from "@shared/diff-engine";
	import { createEventDispatcher } from "svelte";
	import MistakeRegistrationModal from "$lib/components/modals/MistakeRegistrationModal.svelte";
	import type { Submission } from "@shared/api-types";
	import { children } from "svelte/internal";

	const mode = store("mode") as Stores["mode"];
	const hideRegistered = store("hideRegistered") as Stores["hideRegistered"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const hoveredMistake = store("hoveredMistake") as Stores["hoveredMistake"];
	const ds = store("ds") as Stores["ds"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];

	let mistakes: MistakeData[] = [];
	let listContainer: HTMLElement;
	let activeMergeIDs: MistakeId[] = [];
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

		switch($mode) {
			case ToolbarMode.MERGE:
				if (activeMergeIDs.includes(id)) {
					activeMergeIDs.splice(activeMergeIDs.findIndex((el) => el === id), 1);
				} else {
					activeMergeIDs.push(id);
				}

				activeMergeIDs = activeMergeIDs;
				break;
			case ToolbarMode.REGISTER:
				{
					// const data = await regModal.open(mistakes.find((m) => m.id === id)!);
					// dispatch("register", { id, data: data.data, action: data.action });
				}
				break;
			default:
				return;
		}
	}

	async function onBodyKeypress(ev: KeyboardEvent) {
		if (ev.key !== "Enter") return;
		if ($mode !== ToolbarMode.MERGE) return;
		if (activeMergeIDs.length <= 1) return;

		const hashes = activeMergeIDs.map((id) => mistakes.find((m) => m.id === id)!.hash);
		await $ds.mistakeMerge(hashes, $activeWorkspaceID!);

		activeMergeIDs = [];
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

	$: onSubmissionChange($activeSubmission);
</script>

<svelte:body on:keypress={onBodyKeypress}/>

<div class="container">
	<div class="list" bind:this={listContainer}>
		{#each mistakes as m}
		<!-- class:registered={m.isRegistered}
				class:hidden={m.isRegistered && $hideRegistered} -->
			<div
				data-id={m.id}
				class="mistake {m.type}"
				class:hover={$hoveredMistake === m.id}
				class:merging={activeMergeIDs.includes(m.id)}
				on:mouseenter={onMistakeHover}
				on:focus={onMistakeHover}
				on:mouseleave={onMistakeHoverOut}
				on:blur={onMistakeHoverOut}
				on:click={onMistakeClick}
				title={JSON.stringify({
					boundsCheck: m.boundsCheck,
					boundsCorrect: m.boundsCorrect,
					boundsDiff: m.boundsDiff,
					mType: m.subtype
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
			outline: 3px solid yellow;
			box-shadow: 0px 0px 5px 5px yellow;
			z-index: 5;
		}

		&.hidden {
			display: none;
		}
	}
</style>