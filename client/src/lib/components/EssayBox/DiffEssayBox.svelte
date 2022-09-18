<script lang="ts">
	import type { Submission } from "@shared/api-types";
	import EssayBox from "./EssayBox.svelte";
	import { activeSubmission, workspace, hoveredMistake } from "$lib/ts/stores";
	import type { Bounds, Mistake, MistakeId } from "@shared/diff-engine";
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
		const text = parseIgnoreBounds(submission.data!.text, submission.data!.ignoreText);
		essayEl.setPlainText(text);

		// TODO: Load mistakes from dataset
		
		const diff = new Diff(text, $workspace!.template);
		diff.calc();
		renderMistakes(diff.getMistakes());
	}

	function renderMistakes(mistakes: Mistake[]) {
		const diffCopy = [...mistakes];
		diffCopy.sort((a, b) => b.boundsDiff.start - a.boundsDiff.start);



		// Create the highlight elements
		// for (const mistake of diffCopy) {
		// 	if (mistake.subtype === "WORD") {
		// 		const start = mistake.boundsCheck?.start ?? mistake.actions[0].indexCheck;
		// 		const end = mistake.boundsCheck?.end ?? mistake.actions[mistake.actions.length - 1].indexCheck; 
		// 		let id: string | null;

		// 		switch (mistake.type) {
		// 			case "DEL":
		// 				id = essayEl.highlightText(start, end - start, "hl-0");

		// 				if (id) addHighlightToMap(id, mistake.id);
		// 				break;
		// 			case "ADD":
		// 				id = essayEl.addHighlightedText(start, mistake.word!, "hl-1");

		// 				if (id) addHighlightToMap(id, mistake.id);
		// 				break;
		// 			case "MIXED":
		// 				{
		// 					console.warn("NYI");
		// 				}

		// 				break;
		// 		}
		// 	} else {
		// 		const actionArrCopy = [...mistake.actions];
		// 		actionArrCopy.reverse();

		// 		for (const action of actionArrCopy) {
		// 			let id: string | null;

		// 			switch(action.type) {
		// 				case "DEL":
		// 					// Do error.char.length instead of 1, as error.char may contain spaces
		// 					id = essayEl.highlightText(action.indexCheck, action.char.length, "hl-0");
		// 					break;
		// 				case "ADD":
		// 					{ // In a block to scope the variable definition
		// 						let char = action.char;

		// 						if (action.char === "\n") {
		// 							char = "\\n\n";
		// 						}

		// 						id = essayEl.addHighlightedText(action.indexCheck, char, "hl-1");
		// 					}
		// 					break;
		// 			}

		// 			if (id) {
		// 				highlightMap[id] = mistake.id;
		// 				mistakeMap[mistake.id] = [...(mistakeMap[mistake.id] ?? []), id];
		// 			}
		// 		}
		// 	}

			// if (mistake.isRegistered) {
			// 	for (const id of mistakeMap[mistake.id]) {
			// 		highlighter.addClass("hl-status-registered", id);
			// 	}
			// }
		// }
	}

	function addHighlightToMap(highlightId: string, mistakeId: MistakeId) {
		highlightMap[highlightId] = mistakeId;
		mistakeMap[mistakeId] = [...(mistakeMap[mistakeId] ?? []), highlightId];
	}
	
	function onMistakeHover(ev: CustomEvent) {
		const id = ev.detail.id;
		$hoveredMistake = highlightMap[id];
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