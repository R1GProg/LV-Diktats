<script lang="ts">
	import type { RegisterEntry, Submission } from "@shared/api-types";
	import EssayBox from "./EssayBox.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import type { Bounds, MistakeData, MistakeId } from "@shared/diff-engine";
	import config from "$lib/config.json";
	import { mistakeInRegister } from "$lib/ts/util";
	import { ToolbarMode } from "$lib/ts/toolbar";
	import type MistakeSelection from "$lib/ts/MistakeSelection";

	const hoveredMistake = store("hoveredMistake") as Stores["hoveredMistake"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const workspace = store("workspace") as Stores["workspace"];
	const selectedMistakes = store("selectedMistakes") as Stores["selectedMistakes"];
	const mode = store("mode") as Stores["mode"];

	// The timeout ensures that you wont get 50 essays trying to render at once
	// if cycling through them quickly
	let highlightDelayTimeout: number | null = null;
	let essayEl: EssayBox;
	const highlightMap: Record<string, MistakeId> = {}; // HighlightID : MistakeID
	const mistakeMap: Record<MistakeId, string[]> = {} // MistakeID : HighlightID[]

	let register: RegisterEntry[] = [];

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

	async function onSubmissionChange(submissionPromise: Promise<Submission | null> | null) {
		if (submissionPromise === null) {
			essayEl?.setPlainText("");
			return;
		}

		if (highlightDelayTimeout !== null) {
			clearTimeout(highlightDelayTimeout);
		}

		await new Promise<void>((res) => {
			highlightDelayTimeout = window.setTimeout(res, config.highlightDelay);
		});

		const submission = await submissionPromise;

		if (submission === null) {
			essayEl?.setPlainText("");
			return;
		}

		register = (await $workspace)!.register;

		const text = parseIgnoreBounds(submission.data!.text, submission.data!.ignoreText);
		// const text = submission.data!.text;

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
		// essayEl.unattachTextFromDOM();

		// TODO: Render new line characters

		// Parse MERGED mistakes
		const parsedMistakes = mistakes.flatMap((m) => m.subtype === "MERGED" ? m.children : m);

		essayEl.setPlainText(addMissingWordsToText(rawText, parsedMistakes));

		for (const m of parsedMistakes) {
			const highlightClassType = m.type === "DEL" ? 0 : (m.type === "ADD" ? 1 : 2);
			const id = essayEl.highlightText(
				m.boundsDiff.start,
				m.word.length + m.actions.filter((a) => a.type === "ADD").length,
				`hl-${highlightClassType}`
			);

			if (id) {
				addHighlightToMap(id, m.mergedId ?? m.id);

				const mHash = m.mergedId ? mistakes.find((parentM) => parentM.id === m.mergedId)!.hash : m.hash;

				if (mistakeInRegister(mHash, register)) {
					essayEl.setHighlightClass(id, "hl-status-registered");
				}
			}
		}

		for (const m of parsedMistakes.filter((m) => m.type === "MIXED")) {
			for (const a of m.actions) {
				const actionType = a.type === "DEL" ? 0 : 1;
				const id = essayEl.highlightText(m.boundsDiff.start + a.indexDiff!, 1, `hl-2${actionType}`);
				
				if (id) {
					addHighlightToMap(id, m.mergedId ?? m.id);

					const mHash = m.mergedId ? mistakes.find((parentM) => parentM.id === m.mergedId)!.hash : m.hash;

					if (mistakeInRegister(mHash, register)) {
						essayEl.setHighlightClass(id, "hl-status-registered");
					}
				}
			}
		}

		// essayEl.reattachTextToDOM();
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
		essayEl?.clearAllHighlightClassInstances("hover");

		if (id === null || !mistakeMap[id]) return;

		for (const h of mistakeMap[id]) {
			essayEl.setHighlightClass(h, "hover");
		}
	}

	async function onMistakeClick(ev: CustomEvent) {
		if ($mode !== ToolbarMode.REGISTER && $mode !== ToolbarMode.RESUB) return;

		const highlightId = ev.detail.id;
		const mistakeId = highlightMap[highlightId] ?? null;

		$selectedMistakes.toggle(mistakeId);
	}

	function onSelectionChange(mistakeSelection: MistakeSelection) {
		if (!essayEl) return;

		const selection = mistakeSelection.get();

		essayEl.clearAllHighlightClassInstances("hl-status-selected");

		for (const id of selection) {
			for (const highlight of mistakeMap[id]) {
				essayEl.setHighlightClass(highlight, "hl-status-selected");
			}
		}
	}

	function onSelection(ev: CustomEvent) {
		if ($mode !== ToolbarMode.REGISTER) return;

		const selection = ev.detail.selection as Selection;

		if (selection.anchorNode === selection.focusNode) return;

		// Get all the nodes in the selection

		const textNodes = Array.from(essayEl.getTextContainer().childNodes);
		
		// If one of the boundary nodes is on a highlight, get the highlight span node
		const startNode = selection.anchorNode!.parentElement!.classList.contains("highlight") ? selection.anchorNode!.parentNode! : selection.anchorNode!;
		const endNode = selection.focusNode!.parentElement!.classList.contains("highlight") ? selection.focusNode!.parentNode! : selection.focusNode!;

		const unselect = (startNode as Element).classList?.contains("hl-status-selected") ?? false;

		const startIndex = textNodes.findIndex((n) => n === startNode);
		const endIndex = textNodes.findIndex((n) => n === endNode);
		const selectedHighlights = textNodes
			.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1)
			.filter((node) => node.nodeType === document.ELEMENT_NODE)
			.filter((el) => (el as Element).classList.contains("highlight")) as HTMLElement[];
		const mistakes = selectedHighlights.map((h) => highlightMap[h.dataset.highlightId!]);

		if (unselect) {
			$selectedMistakes.remove(...mistakes);
		} else {
			$selectedMistakes.add(...mistakes);
		}
	}

	$: onSelectionChange($selectedMistakes);
	$: onSubmissionChange($activeSubmission);
	$: onHoveredMistakeChange($hoveredMistake);
</script>

<EssayBox
	bind:this={essayEl}
	on:highlight-hover={onMistakeHover}
	on:highlight-hoverout={onMistakeHoverOut}
	on:highlight-click={onMistakeClick}
	on:selection={onSelection}
/>