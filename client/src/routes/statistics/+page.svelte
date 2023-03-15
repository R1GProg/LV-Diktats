<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import { statisticsTemplate, type StatisticsData } from "$lib/ts/Statistics";
	import { downloadText } from "$lib/ts/util";
	import type { Workspace } from "@shared/api-types";
	import Papa from "papaparse";

	const workspace = store("workspace") as Stores["workspace"];

	let statData: StatisticsData[] = [];
	$: statOutput = JSON.stringify(statData, null, 4);

	async function genStatistics() {
		const ws = await $workspace;

		if (ws === null) {
			console.warn("Attempt to generate statistics with a null workspace");
			return;
		}

		statData = [];

		for (const entry of statisticsTemplate) {
			statData.push({
				title: entry.title,
				key: entry.key,
				type: entry.type,
				data: entry.calc(ws)
			});
		}
	}

	$: if ($workspace !== null) genStatistics();

	function getFilePrefix(ws: Workspace) {
		return ws.name.replace(/ ([a-zA-Z])/g, function(v, a) { return a.toUpperCase(); });
	}

	async function downloadJSONAll() {
		const ws = await $workspace;
		if (ws === null) return;

		downloadText(`${getFilePrefix(ws)}-statistics.json`, statOutput);
	}

	async function downloadJSONNum() {
		const ws = await $workspace;
		if (ws === null) return;

		const numData = statData.filter((e) => e.type === "NUMBER");

		downloadText(`${getFilePrefix(ws)}-statistics-num.json`, JSON.stringify(numData, null, 4));
	}

	async function downloadCSVs() {
		const ws = await $workspace;
		if (ws === null) return;

		const csvEntries = statData.filter((e) => e.type === "CSV");

		for (const csv of csvEntries) {
			downloadText(`${getFilePrefix(ws)}-statistics-${csv.key}.csv`, csv.data.toString());
		}

		const numEntries = statData.filter((e) => e.type === "NUMBER");
		const numCSV: { title: string, data: number }[] = [];

		for (const e of numEntries) {
			numCSV.push({ title: e.title, data: e.data as number });
		}

		downloadText(`${getFilePrefix(ws)}-statistics-num.csv`, Papa.unparse(numCSV, { newline: "\n" }));
	}
</script>

<div class="container">
	<div class="output-container">
		<div class="button-container">
			<button on:click={downloadJSONAll}>Lejuplādēt JSON (Visi tipi)</button>
			<button on:click={downloadJSONNum}>Lejuplādēt JSON (Tikai skaitļi)</button>
			<button on:click={downloadCSVs}>Lejuplādēt CSV</button>
		</div>

		<div class="output-data-container">
			<span spellcheck="false">{statOutput}</span>
		</div>
	</div>
</div>

<style lang="scss">
	@import "../../lib/scss/global.scss";

	.container {
		color: $COL_FG_REG;
		padding: 10vh;
		
		h2 {
			font-weight: 400;
		}

		span {
			font-family: $FONT_BODY;
			white-space: pre;
		}

		.output-data-container {
			@include scrollbar;

			background-color: $COL_BG_LIGHT;
			padding: 2vh;
			max-height: 65vh;
			max-width: 86.5vw;
			overflow-y: auto;
		}

		.button-container {
			margin-bottom: 3vh;
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			column-gap: 20px;

			button {
				@include hover_filter;

				border: none;
				background-color: $COL_BG_LIGHT;
				font-family: $FONT_HEADING;
				color: $COL_FG_REG;
				font-size: 1.25rem;
				padding: 0.4em;
			}
		}
	}
</style>