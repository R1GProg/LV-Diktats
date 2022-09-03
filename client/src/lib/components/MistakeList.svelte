<script lang="ts">

</script>

<div class="container">
	<div class="list">
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
		<div class="mistake del">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake add">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>

		<div class="mistake mixed registered">
			<span>konservējis</span>
			<span class="mistake-target">—</span>
			<span>ne dārzeņus</span>
		</div>
	</div>
	<div class="list-footer">
		<div class="footer-visibility">
			<input type="checkbox" id="listHideRegistered">
			<label for="listHideRegistered">slēpt atpazītās</label>
		</div>
		<span class="footer-mistakes">69 (42) kļūdas</span>
	</div>
</div>

<style lang="scss">
	@import "../scss/global.scss";

	$COL_MISTAKE_DEL: #E57373;
	$COL_MISTAKE_ADD: #66BB6A;
	$COL_MISTAKE_MIXED: #FFB74D;

	.container {
		width: 100%;
		height: calc(100% - 1px); // Accounts for the border
		border-top: 1px solid black;
		display: grid;
		grid-template-rows: 1fr auto;
		position: relative;
	}

	.list-footer {
		border-top: 1px solid black;
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

		&.del {
			background-color: $COL_MISTAKE_DEL;
		}

		&.add {
			background-color: $COL_MISTAKE_ADD;
		}

		&.mixed {
			background-color: $COL_MISTAKE_MIXED;
		}

		&.registered {
			filter: brightness(35%);
			
			@include hover_filter(50%);
		}
	}
</style>