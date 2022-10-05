<script lang="ts">
	import EssayBox from "./EssayBox.svelte";
	import { subToToolbarMode, ToolbarMode, type ToolbarModeEvent } from "$lib/ts/toolbar";
	import type { Submission } from "@shared/api-types";
	import type { Bounds, MistakeId } from "@shared/diff-engine";
	import { onMount } from "svelte";
	import type { Stores } from "$lib/ts/stores";
	import store from "$lib/ts/stores";

	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const workspace = store("workspace") as Stores["workspace"];
	const mode = store("mode") as Stores["mode"];
	const ds = store("ds") as Stores["ds"];
	const hoveredMistake = store("hoveredMistake") as Stores["hoveredMistake"];

	let essayEl: EssayBox;
	let haveUnsavedIgnores = false;

	async function onSubmissionChange(submissionPromise: Promise<Submission | null> | null) {
		if (submissionPromise === null || $workspace === null) {
			essayEl?.setPlainText("");
			return;
		}

		const submission = await submissionPromise;

		if (submission === null) {
			essayEl?.setPlainText("");
			return;
		}

		const newText = submission.data!.text;
		const ignoredText = submission.data!.ignoreText ?? [];

		essayEl.setPlainText(newText);

		for (const b of ignoredText) {
			try {
				const id = essayEl.highlightText(b.start, b.end - b.start, "hl-status-ignored")!;
				const els = essayEl.getHighlightEls(id);

				for (const el of els) {
					el.addEventListener("contextmenu", (ev) => {
						ev.preventDefault();
						onHighlightRightClick(id);
					});
				}
			} catch (err) {
				console.warn(err);
			}
		}
	}

	function onSelection(ev: CustomEvent) {
		if ($mode !== ToolbarMode.IGNORE) return;

		const selection = ev.detail.selection as Selection;

		if (
			selection.anchorNode?.parentElement?.classList?.contains("highlight")
			|| selection.focusNode?.parentElement?.classList?.contains("highlight")
		) {
			selection.removeAllRanges();
			return;
		}

		const range = selection.getRangeAt(0);

		const id = essayEl.highlightRange(range, "hl-status-ignored");
		selection.removeAllRanges();

		const els = essayEl.getHighlightEls(id);

		for (const el of els) {
			el.addEventListener("contextmenu", (ev) => {
				ev.preventDefault();
				onHighlightRightClick(id);
			});
		}

		haveUnsavedIgnores = true;
	}

	function onHighlightRightClick(id: string) {
		if ($mode !== ToolbarMode.IGNORE) return;

		essayEl.removeHighlight(id);

		haveUnsavedIgnores = true;
	}

	async function onToolbarModeChange(ev: ToolbarModeEvent) {
		if (ev.prevMode !== ToolbarMode.IGNORE) return;
		if (!haveUnsavedIgnores) return;

		// Calculate the bounds of each highlight
		const bounds: Bounds[] = [];
		let curOffset = 0;

		for (const el of essayEl.getTextContainer().childNodes) {
			const textLen = el.textContent!.length;

			if (el.nodeType !== Node.TEXT_NODE) {
				bounds.push({
					start: curOffset,
					end: curOffset + textLen,
				});
			}

			curOffset += textLen;
		}

		haveUnsavedIgnores = false;

		$ds.textIgnore($activeSubmissionID!, $activeWorkspaceID!, bounds);
	}

	async function onMistakeHover(id: MistakeId | null) {
		if (!essayEl) return;
		if ($mode === ToolbarMode.IGNORE) return;
		
		essayEl.clearHighlights();

		if (id === null) return;

		const subm = await $activeSubmission;
		const mistake = subm?.data.mistakes.find((m) => m.id === id);
		
		if (!mistake || mistake.type === "ADD") return;

		const container = essayEl.getTextContainer();
		container.normalize();
		const rootNode = container.firstChild!;

		const range = document.createRange();

		range.setStart(rootNode, mistake.boundsCheck.start);
		range.setEnd(rootNode, mistake.boundsCheck.end);

		essayEl.highlightRange(range, mistake.type === "MIXED" ? "hl-22" : "hl-0");
	}

	$: onSubmissionChange($activeSubmission);
	$: onMistakeHover($hoveredMistake);

	onMount(() => {
		subToToolbarMode(onToolbarModeChange);
	});
</script>

<EssayBox
	bind:this={essayEl}
	editable={$mode === ToolbarMode.EDIT}
	on:selection={onSelection}
/>