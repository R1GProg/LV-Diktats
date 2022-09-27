<script lang="ts">
	import EssayBox from "./EssayBox.svelte";
	import { subToToolbarMode, ToolbarMode, type ToolbarModeEvent } from "$lib/ts/toolbar";
	import type { Submission } from "@shared/api-types";
	import type { Bounds } from "@shared/diff-engine";
	import { onMount } from "svelte";
	import type { Stores } from "$lib/ts/stores";
	import store from "$lib/ts/stores";

	const activeSubmissionID = store("activeSubmissionID") as Stores["activeSubmissionID"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];
	const activeSubmission = store("activeSubmission") as Stores["activeSubmission"];
	const workspace = store("workspace") as Stores["workspace"];
	const mode = store("mode") as Stores["mode"];
	const ds = store("ds") as Stores["ds"];

	let essayEl: EssayBox;
	let haveUnsavedIgnores = false;
	let isSelecting = false;

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
			const id = essayEl.highlightText(b.start, b.end - b.start, "hl-status-ignored")!;
			const els = essayEl.getHighlightEls(id);

			for (const el of els) {
				el.addEventListener("contextmenu", (ev) => {
					ev.preventDefault();
					onHighlightRightClick(id);
				});
			}
		}
	}

	function onMouseDown() {
		if ($mode !== ToolbarMode.IGNORE) return;

		isSelecting = true;
	}

	function onMouseUp() {
		if (!isSelecting) return;

		const selection = window.getSelection();
		
		if (selection === null) return;
		if (!essayEl?.getTextContainer()?.contains(selection.anchorNode)) return;

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

	$: onSubmissionChange($activeSubmission);

	onMount(() => {
		document.addEventListener("mouseup", onMouseUp);
		document.addEventListener("mousedown", onMouseDown);

		subToToolbarMode(onToolbarModeChange);
	});
</script>

<EssayBox
	bind:this={essayEl}
	editable={$mode === ToolbarMode.EDIT}
/>