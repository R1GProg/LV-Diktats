<script lang="ts">
	import { ToolbarMode } from "$lib/ts/toolbar";
	import EssayBox from "./EssayBox.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import type { MistakeId } from "@shared/diff-engine";

	const workspace = store("workspace") as Stores["workspace"];
	const mode = store("mode") as Stores["mode"];
	const activeHighlight = store("hoveredMistake") as Stores["hoveredMistake"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];

	let essay: EssayBox;
	let text = "";

	$: if ($workspace !== null) {
		$workspace.then((ws) => { text = ws.template });
	} else {
		text = "";
	}

	async function onMistakeHover(id: MistakeId | null) {
		if (!essay) return;
		
		essay.clearHighlights();

		if (id === null) return;

		const subm = await $activeSubmission;
		const mistake = subm?.data.mistakes.find((m) => m.id === id);
		
		if (!mistake || mistake.type === "DEL") return;

		const container = essay.getTextContainer();
		container.normalize();
		const rootNode = container.firstChild!;

		const range = document.createRange();

		range.setStart(rootNode, mistake.boundsCorrect.start);
		range.setEnd(rootNode, mistake.boundsCorrect.end);

		essay.highlightRange(range, mistake.type === "MIXED" ? "hl-22" : "hl-1");
	}

	$: onMistakeHover($activeHighlight);
</script>

<EssayBox
	text={text}
	editable={$mode === ToolbarMode.EDIT}
	bind:this={essay}
/>