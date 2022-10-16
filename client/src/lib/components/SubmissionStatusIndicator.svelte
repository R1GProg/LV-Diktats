<script lang="ts">
	import type { RegisterEntry, Submission, Workspace } from "@shared/api-types";
	import store, { type Stores } from "$lib/ts/stores";
	import { getSubmissionGradingStatus, mistakeInRegister } from "$lib/ts/util";
	import type { MistakeData } from "@shared/diff-engine";

	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const workspace = store("workspace") as Stores["workspace"];
	let status: number = 0;

	async function onSubmChange(submPromise: Promise<Submission | null> | null, wsPromise: Promise<Workspace> | null) {
		const subm = await submPromise;
		const ws = await wsPromise;

		if (subm === null || ws === null) return;

		status = getSubmissionGradingStatus(subm, ws);
	}

	$: onSubmChange($activeSubmission, $workspace);
</script>

{#if $workspace !== null}
{#await $activeSubmission then subm}
{#if subm !== null}
<h2 class="indicator ind-{status}" class:hidden={subm.state === "REJECTED"}>
	{#if status === 0}
		{"Nav labots"}
	{:else if status === 1}
		{"Nav pabeigts"}
	{:else if status === 2}
		{"Pabeigts"}
	{/if}
</h2>
{/if}
{/await}
{/if}

<style lang="scss">
	@import "../scss/global.scss";

	.indicator {
		font-size: 0.6em;
		color: $COL_FG_REG;
		text-transform: uppercase;
		font-weight: 400;
		margin: 0;

		&.hidden { 
			visibility: hidden;
		}

		&.ind-0 {
			color: $COL_SUBM_REJECTED;
		}

		&.ind-1 {
			color: rgb(210, 180, 20);
		}

		&.ind-2 {
			color: $COL_SUBM_DONE;
		}
	}
</style>