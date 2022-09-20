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
			essayEl.highlightText(b.start, b.end - b.start, "hl-status-ignored");
		}
	}

	function onKeyPress(ev: KeyboardEvent) {
		if (ev.key !== "Enter") return;
		if ($mode !== ToolbarMode.IGNORE) return;

		const selection = window.getSelection();

		if (selection === null) return;

		const range = selection.getRangeAt(0);
		essayEl.highlightRange(range, "hl-status-ignored");

		haveUnsavedIgnores = true;
	}

	function onSelect() {
		if ($mode !== ToolbarMode.IGNORE) return;
		
		// const selection = window.getSelection();
		// TODO: To be used for better UI when selecting text for ignore and for mistake merge
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
		document.addEventListener("keydown", onKeyPress);
		document.addEventListener("selectionchange", onSelect);

		subToToolbarMode(onToolbarModeChange);
	});
</script>

<EssayBox
	bind:this={essayEl}
	editable={$mode === ToolbarMode.EDIT}
/>