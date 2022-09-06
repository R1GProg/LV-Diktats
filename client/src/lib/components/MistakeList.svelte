<script lang="ts">
	import type { MistakeId } from "@shared/diff-engine/src/Mistake";
	import type Mistake from "@shared/diff-engine/src/Mistake";
	import { createEventDispatcher } from "svelte";
	import Diff from "./Diff.svelte";

	let mistakes: Mistake[] = [];
	let hoverId: MistakeId | null = null;
	let listContainer: HTMLElement;
	const dispatch = createEventDispatcher();

	export function set(mistakeArr: Mistake[]) {
		mistakes = mistakeArr;
	}

	export function setMistakeHover(id: MistakeId) {
		hoverId = id;
		listContainer.querySelector(`[data-id='${hoverId}']`)!.scrollIntoView({ behavior: "smooth" });
	}

	export function clearMistakeHover() {
		hoverId = null;
	}

	function onMistakeHover(ev: Event) {
		const id = (ev.target as HTMLElement).dataset.id!;
		hoverId = id;
		dispatch("hover", { source: "LIST", id });
	}

	function onMistakeHoverOut(ev: Event) {
		const id = (ev.target as HTMLElement).dataset.id!;
		hoverId = null;
		dispatch("hoverout", { source: "LIST", id });
	}
</script>

<div class="container">
	<div class="list" bind:this={listContainer}>
		{#each mistakes as m (m.id)}
			<div
				data-id={m.id}
				class="mistake {m.type}"
				class:hover={hoverId === m.id}
				on:mouseenter={onMistakeHover}
				on:focus={onMistakeHover}
				on:mouseleave={onMistakeHoverOut}
				on:blur={onMistakeHoverOut}
				title={JSON.stringify({
					actions: m.actions.map((a) => ({char: a.char, charCorrect: a.charCorrect, type: a.type, indexDiff: a.indexDiff})),
					boundsCheck: m.boundsCheck ?? m.actions[0].indexCheck,
					boundsCorrect: m.boundsCorrect,
					boundsDiff: m.boundsDiff,
					mType: m.subtype
				}, null, 2)}
			>

				<!-- <span>konservējis</span> -->
				<span class="mistake-target">
					{m.subtype === "WORD" ? m.word : (m.actions[0].char === " " ? "\" \"" : m.actions[0].char)}
				</span>
				<!-- <span>ne dārzeņus</span> -->
			</div>
		{/each}
	</div>
	<div class="list-footer">
		<div class="footer-visibility">
			<input type="checkbox" id="listHideRegistered" title="Slēpt atpazītās kļūdas">
			<label for="listHideRegistered" title="Slēpt atpazītās kļūdas">slēpt atpazītās</label>
		</div>
		<!-- TODO: <NumLength> (<NumRecognized>) kļūdas -->
		<span class="footer-mistakes">{mistakes.length} kļūdas</span>
	</div>
</div>

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
		height: 2.25em;
		font-family: $FONT_BODY;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;

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
	}
</style>