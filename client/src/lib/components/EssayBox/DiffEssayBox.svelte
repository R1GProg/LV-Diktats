<script lang="ts">
	import type { Submission } from "@shared/api-types";
	import EssayBox from "./EssayBox.svelte";
	import { activeSubmission, workspace, hoveredMistake } from "$lib/ts/stores";
	import type { Bounds, Mistake, MistakeData, MistakeId } from "@shared/diff-engine";
	import Diff from "@shared/diff-engine";

	let essayEl: EssayBox;
	const highlightMap: Record<string, MistakeId> = {}; // HighlightID : MistakeID
	const mistakeMap: Record<MistakeId, string[]> = {} // MistakeID : HighlightID[]

	function parseIgnoreBounds(rawText: string, ignoreBounds: Bounds[]) {
		let text = rawText;
		let offset = 0;

		for (const bounds of ignoreBounds) {
			const sub1 = text.substring(0, bounds.start - offset);
			const sub2 = text.substring(bounds.end - offset);
			text = (sub1 + sub2).trim();

			offset += bounds.end - bounds.start;
		}

		return text;
	}

	async function onSubmissionChange(submissionPromise: Promise<Submission> | null) {
		if (submissionPromise === null) {
			essayEl?.setPlainText("");
			return;
		}

		const submission = await submissionPromise;
		// const text = parseIgnoreBounds(submission.data!.text, submission.data!.ignoreText);
		const text = submission.data!.text;

		renderMistakes(text, submission.data!.mistakes);
	}

	function addMissingWordsToText(rawText: string, mistakes: MistakeData[]) {
		let text = rawText;

		// The ADD mistakes and MIXED mistake ADD characters need to be added
		// in parallel, otherwise the diff indices drift from the correct positions

		const addContentArr = mistakes
			.filter((m) => m.type === "ADD")
			.map((m) => ({ content: m.word, index: m.boundsDiff.start }));

		const subContentArr = mistakes
			.filter((m) => m.type === "MIXED")
			.flatMap((m) => m.actions
				.filter((a) => a.type === "ADD")
				.map((a) => ({ content: a.char, index: m.boundsDiff.start + a.indexDiff }))
			);

		const contentArr = [...addContentArr, ...subContentArr];

		contentArr.sort((a, b) => a.index - b.index);

		for (const entry of contentArr) {
			const textBefore = text.substring(0, entry.index);
			const textAfter = text.substring(entry.index);

			text = `${textBefore}${entry.content}${textAfter}`;
		}

		return text;
	}

	function renderMistakes(rawText: string, mistakes: MistakeData[]) {
		// TODO: Render new line characters

		essayEl.setPlainText(addMissingWordsToText(rawText, mistakes));

		for (const m of mistakes) {
			const highlightClassType = m.type === "DEL" ? 0 : (m.type === "ADD" ? 1 : 2);
			const id = essayEl.highlightText(
				m.boundsDiff.start,
				m.word.length + m.actions.filter((a) => a.type === "ADD").length,
				`hl-${highlightClassType}`
			);

			if (id) addHighlightToMap(id, m.id);
		}

		for (const m of mistakes.filter((m) => m.type === "MIXED")) {
			for (const a of m.actions) {
				const actionType = a.type === "DEL" ? 0 : 1;
				const id = essayEl.highlightText(m.boundsDiff.start + a.indexDiff!, 1, `hl-2${actionType}`);
				if (id) addHighlightToMap(id, m.id);
			}
		}
	}

	function addHighlightToMap(highlightId: string, mistakeId: MistakeId) {
		highlightMap[highlightId] = mistakeId;
		mistakeMap[mistakeId] = [...(mistakeMap[mistakeId] ?? []), highlightId];
	}
	
	function onMistakeHover(ev: CustomEvent) {
		const id = ev.detail.id;

		$hoveredMistake = highlightMap[id] ?? null;
	}

	function onMistakeHoverOut() {
		$hoveredMistake = null;
	}

	function onHoveredMistakeChange(id: MistakeId | null) {
		if (id === null) {
			essayEl?.clearAllHighlightClassInstances("hover");
			return;
		}

		if (!mistakeMap[id]) return;

		for (const h of mistakeMap[id]) {
			essayEl.setHighlightClass(h, "hover");
		}
	}

	$: onSubmissionChange($activeSubmission);
	$: onHoveredMistakeChange($hoveredMistake);
</script>

<EssayBox
	bind:this={essayEl}
	on:highlight-hover={onMistakeHover}
	on:highlight-hoverout={onMistakeHoverOut}
/>