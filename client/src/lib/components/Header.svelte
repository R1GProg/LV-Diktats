<script>
	import { page } from "$app/stores";
</script>

<header>
	<nav>
		<a href="/" class:active={$page.url.pathname === "/"}>Labošana</a>
		<a href="/register" class:active={$page.url.pathname === "/register"}>Kļūdu reģistrs</a>
		<a href="/settings" class:active={$page.url.pathname === "/settings"}>Iestatījumi</a>
	</nav>

	<div class="workspace-selector">
		<select>
			<option value="gurki">Mazsālīto gurķu blūzs</option>
			<option value="custom">- Augšupielādēt datus -</option>
		</select>
	</div>
</header>

<style lang="scss">
	@import "../scss/global.scss";

	header {
		grid-area: header;
		background-color: $COL_BG_DARK;
		border-bottom: 1px solid $COL_ACCENT;

		height: $HEADER_HEIGHT;

		display: grid;
		grid-template-areas: "nav workspace";
		grid-template-columns: 1fr auto;

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

	.workspace-selector {
		grid-area: workspace;
		display: grid;
		height: 100%;
		align-items: center;
		grid-template-areas: "select";

		select {
			appearance: none;
			border: none;

			width: 100%;

			margin: 0;
			padding: 5px clamp(1.5em, 2vw , 2em) 5px 10px;

			font-family: $FONT_HEADING;
			font-size: calc(#{$HEADER_HEIGHT} / 3);
			cursor: pointer;

			color: $COL_FG_REG;
			background-color: $COL_BG_LIGHT;
			transition: background-color 0.3s;

			grid-area: select;


			&:focus {
				outline: 1px solid $COL_FG_DARK;
			}
		}

		&::after {
			content: "";
			width: 0.9em;
			height: 0.6em;
			justify-self: end;
			margin-right: 0.5em;
			margin-top: 0.15em;
			background-color: $COL_FG_DARK;
			clip-path: polygon(100% 0%, 0 0%, 50% 100%);

			transition: background-color 0.3s;

			grid-area: select;
		}

		&:hover {
			select {
				background-color: $COL_BG_REG;
			}

			&::after {
				background-color: $COL_FG_REG;
			}
		}
	}
</style>