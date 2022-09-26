<script lang="ts">
	import type { RegisterEntry, Submission } from "@shared/api-types";
	import EssayBox from "./EssayBox.svelte";
	import store, { type Stores } from "$lib/ts/stores";
	import type { Bounds, MistakeData, MistakeId } from "@shared/diff-engine";
	import config from "$lib/config.json";
	import { mistakeInRegister } from "$lib/ts/util";

	const hoveredMistake = store("hoveredMistake") as Stores["hoveredMistake"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const workspace = store("workspace") as Stores["workspace"];

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

	$: onSubmissionChange($activeSubmission);
	$: onHoveredMistakeChange($hoveredMistake);
</script>

<EssayBox
	bind:this={essayEl}
	on:highlight-hover={onMistakeHover}
	on:highlight-hoverout={onMistakeHoverOut}
/>