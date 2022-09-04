<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import ServerCheckStatus from "$lib/components/modals/status/ServerCheckStatus.svelte";
	import "@fontsource/roboto-condensed/400.css";
	import "@fontsource/roboto/400.css";
</script>

<div class="page-container">
	<Header/>
	<main>
		<slot></slot>
	</main>
</div>

<ServerCheckStatus/>

<style lang="scss">
	@import "../lib/scss/global.scss";

	.page-container {
		background-color: $COL_BG_REG;
		width: 100vw;
		height: 100vh;
		overflow: hidden;

		display: grid;
		grid-template-areas: "header" "main";
		grid-template-rows: auto 1fr;
	}

	main {
		grid-area: main;
	}
</style>