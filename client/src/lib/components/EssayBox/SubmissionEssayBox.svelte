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

	function setNewIgnores() {
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

		$ds.textIgnore($activeSubmissionID!, $activeWorkspaceID!, bounds);
	}

	async function onToolbarModeChange(ev: ToolbarModeEvent) {
		if (ev.prevMode !== ToolbarMode.IGNORE) return;
		if (!haveUnsavedIgnores) return;

		haveUnsavedIgnores = false;
		setNewIgnores();
	}

	async function onBodyKeypress(ev: KeyboardEvent) {
		if (ev.key !== "Enter") return;
		if ($mode !== ToolbarMode.IGNORE) return;
		
		haveUnsavedIgnores = false;
		setNewIgnores();
	}

	function adjustRangeForIgnores(bounds: Bounds) {
		if (!essayEl) return;

		const nodes = essayEl.getTextContainer().childNodes;
		let curTextOffset = 0;
		let targetNodeIndex = 0;
		let ignoreTextLength = 0;

		for (let i = 0; i < nodes.length; i++) {
			const nodeLen = nodes[i].textContent!.length;

			if (nodes[i].nodeType === document.ELEMENT_NODE) {
				ignoreTextLength += nodeLen;
			} else if (nodeLen + curTextOffset > bounds.start + ignoreTextLength) {
				targetNodeIndex = i;
				break;
			}

			curTextOffset += nodeLen;
		}

		const target = nodes[targetNodeIndex];
		const range = document.createRange();

		range.setStart(target, bounds.start - curTextOffset + ignoreTextLength);
		range.setEnd(target, bounds.end - curTextOffset + ignoreTextLength);

		return range;
	}

	async function onMistakeHover(id: MistakeId | null) {
		if (!essayEl) return;
		if ($mode === ToolbarMode.IGNORE) return;

		const container = essayEl.getTextContainer();
		const parentContainer = container.parentElement!;
		const curScroll = parentContainer.scrollTop;
		
		essayEl.clearHighlightsByClass("hl-extmistake");

		// Fixes the scroll resetting to the top when deleting the highlight
		parentContainer.scrollTo({ top: curScroll + 1 });

		if (id === null) return;

		const subm = await $activeSubmission;
		const mistake = subm?.data.mistakes.find((m) => m.id === id);
		
		if (!mistake || mistake.type === "ADD") return;

		container.normalize();
		const range = adjustRangeForIgnores(mistake.boundsCheck);

		if (!range) return;

		const hId = essayEl.highlightRange(
			range,
			mistake.type === "MIXED" ? "hl-22" : "hl-0",
			"hl-extmistake"
		);

		const targetEl = essayEl.getHighlightEls(hId)[0];
		targetEl.scrollIntoView({ block: "start", behavior: "smooth" });
	}

	$: onSubmissionChange($activeSubmission);
	$: onMistakeHover($hoveredMistake);

	onMount(() => {
		subToToolbarMode(onToolbarModeChange);

		document.addEventListener("keypress", onBodyKeypress);
	});
</script>

<EssayBox
	bind:this={essayEl}
	editable={$mode === ToolbarMode.EDIT}
	on:selection={onSelection}
/>