<script lang="ts">
	import type Mistake from "@shared/diff-engine/Mistake";

	let mistakes: Mistake[] = [];

	export function set(mistakeArr: Mistake[]) {
		mistakes = mistakeArr;
	}
</script>

<div class="container">
	<div class="list">
		{#each mistakes as mistake}
			<div class="mistake {mistake.type}">
				<!-- <span>konservējis</span> -->
				<span class="mistake-target">{mistake.subtype === "WORD" ? mistake.word : mistake.actions[0].char}</span>
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