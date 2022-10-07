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

		const container = essay.getTextContainer();
		const parentContainer = container.parentElement!;
		const curScroll = parentContainer.scrollTop;

		essay.clearHighlightsByClass("hl-extmistake");

		// Fixes the scroll resetting to the top when deleting the highlight
		parentContainer.scrollTo({ top: curScroll + 1 });

		if (id === null) return;

		const subm = await $activeSubmission;
		const mistake = subm?.data.mistakes.find((m) => m.id === id);
		
		if (!mistake || mistake.type === "DEL") return;

		container.normalize();
		const rootNode = container.firstChild!;

		const range = document.createRange();

		range.setStart(rootNode, mistake.boundsCorrect.start);
		range.setEnd(rootNode, mistake.boundsCorrect.end);

		const hId = essay.highlightRange(
			range,
			mistake.type === "MIXED" ? "hl-22" : "hl-1",
			"hl-extmistake"
		);

		const targetEl = essay.getHighlightEls(hId)[0];
		targetEl.scrollIntoView({ block: "start", behavior: "smooth" });
	}

	$: onMistakeHover($activeHighlight);
</script>

<EssayBox
	text={text}
	editable={$mode === ToolbarMode.EDIT}
	bind:this={essay}
/>