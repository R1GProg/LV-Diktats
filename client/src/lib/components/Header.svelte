<script lang="ts">
	import { page } from "$app/stores";
	import store, { type Stores } from "$lib/ts/stores";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import VariationSelector from "./VariationSelector.svelte";
	import WorkspaceSelector from "./WorkspaceSelector.svelte";

	const selectedMultiVariation = store("selectedMultiVariation") as Stores["selectedMultiVariation"];
	const mode = store("mode") as Stores["mode"];	
</script>

<header>
	<nav>
		<a href="/" class:active={$page.url.pathname === "/"}>Labošana</a>
		<a href="/register" class:active={$page.url.pathname === "/register"}>Kļūdu reģistrs</a>
		<a href="/settings" class:active={$page.url.pathname === "/settings"}>Iestatījumi</a>
	</nav>

	<VariationSelector
		bind:selected={$selectedMultiVariation}
		hidden={$mode !== ToolbarMode.REGISTER_MULTI || $page.url.pathname !== "/"}
	/>
	<WorkspaceSelector/>
</header>

<style lang="scss">
	@import "../scss/global.scss";

	header {
		grid-area: header;
		background-color: $COL_BG_DARK;
		border-bottom: 1px solid $COL_ACCENT;

		height: $HEADER_HEIGHT;

		display: grid;
		grid-template-areas: "nav variation workspace";
		grid-template-columns: 1fr auto auto;

		padding-left: 1vw;
		padding-right: 1vw;
	}

	nav {
		grid-area: nav;

		display: grid;
		grid-template-columns: repeat(3, 1fr);
		width: min-content;
		column-gap: 1em;
		font-size: calc(#{$HEADER_HEIGHT} / 2.25);

		a {
			font-family: $FONT_HEADING;
			color: $COL_FG_REG;
			text-decoration: none;
			white-space: nowrap;

			height: 100%;

			display: flex;
			align-items: center;

			transition: color 0.3s;

			&:hover {
				color: $COL_FG_DARK;
			}
			

			&::after {
				content: "";
				position: absolute;
				width: 0;
				height: 5px;
				bottom: 0;
				background-color: $COL_FG_REG;
			}

			&.active {
				position: relative;
			}

			&.active::after {
				width: 100%;
			}
		}
	}
</style>