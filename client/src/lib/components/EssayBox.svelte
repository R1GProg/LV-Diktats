<script lang="ts">
	import { onMount, createEventDispatcher } from "svelte";
	import HighlightTooltip from "$lib/components/HighlightTooltip.svelte";
	import type Highlighter from "web-highlighter";
	import type { MistakeId, Mistake, Bounds } from "@shared/diff-engine";
	import type { Action } from "@shared/diff-engine";
	import { mode } from "$lib/ts/stores";
	import { subToToolbarMode, ToolbarMode, type ToolbarModeEvent } from "$lib/ts/toolbar";

	export let editable = false;
	export let text = "";
	export let diff: Mistake[] = [];
	export let submEssay = false; // true - essay is for the submission
	let textContainer: HTMLElement;
	let tooltip: HighlightTooltip;
	let highlighter: Highlighter;

	const highlightMap: Record<string, MistakeId> = {}; // HighlightID : MistakeID
	const mistakeMap: Record<MistakeId, string[]> = {} // MistakeID : HighlightID[]

	const dispatch = createEventDispatcher();

	export function getText() {
		return textContainer.textContent!;
	}

	export function set(newText: string, newDiff: Mistake[]) {
		text = newText;
		textContainer.innerHTML = newText;
		diff = newDiff;

		// Do it on the next event cycle to allow the HTML to render
		// No idea whether it is necessary, but it seems to be more consistently correct with this?
		setTimeout(() => {
			highlightMistakes();
		}, 0);
	}

	export function setPlainText(newText: string) {
		text = newText;
		textContainer.innerHTML = newText;
	}

	export function setTextWithIgnores(newText: string, ignoredText: Bounds[]) {
		text = newText;
		textContainer.innerHTML = newText;

		for (const b of ignoredText) {
			highlightText(b.start, b.end - b.start, "hl-ignore");
		}
	}

	function addHighlightToMap(highlightId: string, mistakeId: MistakeId) {
		highlightMap[highlightId] = mistakeId;
		mistakeMap[mistakeId] = [...(mistakeMap[mistakeId] ?? []), highlightId];
	}

	function highlightMistakes() {
		const diffCopy = [...diff];
		diffCopy.sort((a, b) => b.boundsDiff.start - a.boundsDiff.start);

		// Create the highlight elements
		for (const mistake of diffCopy) {
			if (mistake.subtype === "WORD") {
				const start = mistake.boundsCheck?.start ?? mistake.actions[0].indexCheck;
				const end = mistake.boundsCheck?.end ?? mistake.actions[mistake.actions.length - 1].indexCheck; 
				let id: string | null;

				switch (mistake.type) {
					case "DEL":
						id = highlightText(start, end - start, "hl-0");

						if (id) addHighlightToMap(id, mistake.id);
						break;
					case "ADD":
						id = addHighlightedText(start, mistake.word!, "hl-1");

						if (id) addHighlightToMap(id, mistake.id);
						break;
					case "MIXED":
						{
							const addActions = mistake.actions.filter((a) => a.type === "ADD").reverse();
							const delActions = mistake.actions.filter((a) => a.type === "DEL").reverse();
							const subActions = mistake.actions.filter((a) => a.type === "SUB").reverse();

							// Highlight the actions
							for (const a of delActions) {
								const aId = highlightText(a.indexCheck, a.char.length, "hl-20");

								if (aId) addHighlightToMap(aId, mistake.id);
							}

							for (const a of subActions) {
								const aId = highlightText(a.indexCheck, a.char.length, "hl-22");

								if (aId) addHighlightToMap(aId, mistake.id);
							}

							// Initially set all characters as existing
							const wordMeta: {
								char: string,
								type: "ACTION" | "EXISTING",
								action?: Action
							}[] = mistake.word.split("").map((c) => ({ char:c, type: "EXISTING" }));

							for (const a of mistake.actions) {
								const charIndex = a.indexDiff - mistake.boundsDiff.start;

								if (a.type === "ADD") {
									wordMeta.splice(charIndex, 0, {
										char: a.char,
										type: "ACTION",
										action: a,
									});
								} else {
									wordMeta[charIndex] = { char: a.char, type: "ACTION", action: a };
								}
							}

							// Highlight the other letters part of the word
							// const filteredMetadata = mistake.wordMeta!.filter((c) => c?.action?.type !== "ADD");
							const filteredMetadata = wordMeta.filter((c) => c?.action?.type !== "ADD");

							for (let i = 0; i < filteredMetadata.length; i++) {
								const char = filteredMetadata[i];

								if (char.type === "ACTION") continue;

								let len = 1;

								while (
									i + len < filteredMetadata.length
									&& filteredMetadata[i + len].type !== "ACTION"
								) {
									len++;
								}

								const startIndex = mistake.boundsCheck!.start + i;
								const aId = highlightText(startIndex, len, "hl-2");

								if (aId) addHighlightToMap(aId, mistake.id);

								i += len - 1;
							}

							for (const a of addActions) {
								const aId = addHighlightedText(a.indexCheck, a.char, "hl-21");

								if (aId) addHighlightToMap(aId, mistake.id);
							}
						}

						break;
				}
			} else {
				const actionArrCopy = [...mistake.actions];
				actionArrCopy.reverse();

				for (const action of actionArrCopy) {
					let id: string | null;

					switch(action.type) {
						case "DEL":
							// Do error.char.length instead of 1, as error.char may contain spaces
							id = highlightText(action.indexCheck, action.char.length, "hl-0");
							break;
						case "ADD":
							{ // In a block to scope the variable definition
								let char = action.char;

								if (action.char === "\n") {
									char = "\\n\n";
								}

								id = addHighlightedText(action.indexCheck, char, "hl-1");
							}
							break;
						case "SUB":
							id = highlightText(action.indexCheck, action.char.length, "hl-22");
							break;
						case "NONE":
							id = null;
							break;
					}

					if (id) {
						highlightMap[id] = mistake.id;
						mistakeMap[mistake.id] = [...(mistakeMap[mistake.id] ?? []), id];
					}
				}
			}

			if (mistake.isRegistered) {
				for (const id of mistakeMap[mistake.id]) {
					highlighter.addClass("hl-status-registered", id);
				}
			}
		}
	}

	function getHighlightStartNode(offset: number) {
		let walkedOffset = 0;
		let startNode: Node | null = null;
		let startNodeIndex: number = -1;

		for (let i = 0; i < textContainer.childNodes.length; i++) {
			const node = textContainer.childNodes[i];
			const nodeLen = node.textContent!.length;

			// If the node is added text, skip it
			if (node.nodeType !== Node.TEXT_NODE) {
				const el = node as HTMLElement;
				
				if (el.classList.contains("added-text")) {
					continue;
				}
			}

			if (walkedOffset + nodeLen >= offset) {
				startNode = node.nodeType === Node.TEXT_NODE ? node : node.firstChild;
				startNodeIndex = i;
				break;
			} else {
				walkedOffset += nodeLen;
			}
		}

		return { node: startNode, index: startNodeIndex, offset: offset - walkedOffset };
	}

	function highlightText(offset: number, length: number, ...style: string[]) {
		if (!highlighter) {
			console.warn("Attempt to highlight before web-highlighter has been imported!");
			return null;
		}

		const {
			node: startNode,
			index: startNodeIndex,
			offset: startOffset
		} = getHighlightStartNode(offset);

		if (startNode === null) {
			console.warn("Attempt to highlight out of range!");
			return null;
		}

		const startNodeLen = startNode.textContent!.length;

		let endOffset = startOffset + length;
		let endNode = startNode;

		if (startOffset + length > startNodeLen) {
			// Search for the end node
			let walkedLength = length - (startNodeLen - startOffset);

			for (let i = startNodeIndex + 1; i < textContainer.childNodes.length; i++) {
				const node = textContainer.childNodes[i];
				const nodeLen = node.textContent!.length;

				if (walkedLength <= nodeLen) {
					endNode = node.nodeType === Node.TEXT_NODE ? node : node.firstChild!;
					endOffset = walkedLength;
					break;
				} else {
					walkedLength -= nodeLen;
				}
			}
		}

		const range = document.createRange();
		range.setStart(startNode, startOffset);
		range.setEnd(endNode, endOffset);

		const highlight = highlighter.fromRange(range);

		for (const entry of style) {
			highlighter.addClass(entry, highlight.id);
		}

		return highlight.id;
	}

	function addHighlightedText(offset: number, text: string, ...style: string[]) {
		if (!highlighter) {
			console.warn("Attempt to highlight before web-highlighter has been imported!");
			return null;
		}

		const {
			node: startNode,
			index: startNodeIndex,
			offset: startOffset
		} = getHighlightStartNode(offset);

		if (startNode === null) {
			console.warn("Attempt to highlight out of range!");
			return null;
		}

		const textNode = document.createTextNode(text);
		const parentRange = document.createRange();
		parentRange.setStart(startNode, startOffset);
		parentRange.insertNode(textNode);
		startNode.parentElement!.normalize();

		const rangeNode = startNode.textContent === "" ? textContainer.firstChild! : startNode;

		const range = document.createRange();
		range.setStart(rangeNode, startOffset);
		range.setEnd(rangeNode, startOffset + text.length);

		const id = highlighter.fromRange(range).id;
		
		for (const entry of style) {
			highlighter.addClass(entry, id);
		}

		highlighter.addClass("added-text", id);
		return id;
	}

	export function setMistakeHover(id: MistakeId) {
		if (!highlightMap[id]) return;

		for (const highlight of mistakeMap[id]) {
			highlighter.addClass("hover-external", highlight);
		}
	}

	export function clearMistakeHover(id: MistakeId) {
		if (!highlightMap[id]) return;

		for (const highlight of mistakeMap[id]) {
			highlighter.removeClass("hover-external", highlight);
		}
	}

	function onHighlightHover(id: string) {
		highlighter.addClass("hover", id);
	}

	function onHighlightHoverOut(id: string) {
		highlighter.removeClass("hover", id);
	}

	async function initHighlighting() {
		const svelteClass = textContainer.className.match(/s-.+?( |$)/)![0].trim();
		const Highlighter = (await import("web-highlighter")).default;

		highlighter = new Highlighter({
			wrapTag: "span",
			$root: textContainer,
			style: {
				className: ["highlight", svelteClass]
			}
		});

		highlighter.on(Highlighter.event.HOVER, ({ id }) => {
			onHighlightHover(id);
			dispatch("hover", { source: "TEXT", id: highlightMap[id] });
		});

		highlighter.on(Highlighter.event.HOVER_OUT, ({ id }) => {
			onHighlightHoverOut(id);
			dispatch("hoverout", { source: "TEXT", id: highlightMap[id] });
		});
	}

	function onKeyPress(ev: KeyboardEvent) {
		if (ev.key !== "Enter") return;
		if ($mode !== ToolbarMode.IGNORE) return;

		const selection = window.getSelection();

		if (selection === null) return;

		const range = selection.getRangeAt(0);
		const h = highlighter.fromRange(range);
		highlighter.addClass("hl-ignore", h.id);
	}

	function onSelect() {
		if ($mode !== ToolbarMode.IGNORE) return;
		
		// const selection = window.getSelection();
	}

	function onToolbarModeChange(ev: ToolbarModeEvent) {
		if (ev.prevMode !== ToolbarMode.IGNORE) return		

		// Calculate the bounds of each highlight
		const bounds: Bounds[] = [];
		let curOffset = 0;

		for (const el of textContainer.childNodes) {
			const textLen = el.textContent!.length;

			if (el.nodeType !== Node.TEXT_NODE) {
				bounds.push({
					start: curOffset,
					end: curOffset + textLen,
				});
			}

			curOffset += textLen;
		}

		dispatch("ignore", { bounds });
	}

	onMount(async () => {
		// actionRegister.loadActionRegister();

		await initHighlighting();

		if (submEssay) {
			document.addEventListener("keydown", onKeyPress);
			document.addEventListener("selectionchange", onSelect);

			subToToolbarMode(onToolbarModeChange);
		}
	});
</script>

<div class="textbox">
	<span
		class="container"
		bind:this={textContainer}
		contenteditable={editable}
		spellcheck="false"
	>{text}</span>

	<!-- A stupid workaround to avoid Svelte style purging for the dynamically added elements -->
	<span class=".highlight hl-0 hl-1 hl-2 hl-20 hl-21 hl-22 hl-3 hl-status-registered hl-ignore active hover hover-external"></span>
</div>

<HighlightTooltip bind:this={tooltip}/>

<style lang="scss">
	@import "../scss/global.scss";

	.textbox {
		border: 1px solid rgba(0,0,0,0.15);
		width: calc(100% - 20px);
		height: calc(100% - 10px);
		// text-align: justify;
		text-align: left;
		font-size: 1rem;
		font-family: $FONT_BODY;
		overflow-y: auto;
		padding: 10px;

		background-color: $COL_BG_LIGHT;
		color: $COL_FG_REG;

		@include scrollbar;
	}

	.container {
		width: 100%;
		white-space: pre-line;
	}

	.container:focus {
		outline: none;
		background-color: rgba(230, 200, 20, 0.1);
	}

	:global(.highlight) {
		cursor: pointer;
		transition: filter 0.3s, transform 0.3s, background-color 0.3s, color 0.3s;
		background-color: rgba(255, 255, 0, 0.35);
		color: black;

		&.hover {
			filter: brightness(85%);
		}

		&.hover-external {
			filter: brightness(50%);
		}

		// !!! Note when adding new styles: add the class to the workaround span in the component body !!!
		&.hl-0 { // DEL
			background-color: $COL_MISTAKE_DEL;
		}

		&.hl-1 { // ADD
			background-color: $COL_MISTAKE_ADD;
		}

		&.hl-2 { // MIXED
			color: $COL_FG_REG;
			background-color: rgba($COL_MISTAKE_MIXED, 0.15);
		}

		&.hl-20 { // MIXED, DEL CHAR
			color: #852121;
			background-color: $COL_MISTAKE_MIXED;
		}

		&.hl-21 { // MIXED, ADD CHAR
			color: #588630;
			background-color: $COL_MISTAKE_MIXED;
		}

		&.hl-22 { // MIXED, SUB CHAR
			color: black;
			background-color: $COL_MISTAKE_MIXED;
		}

		&.hl-ignore {
			color: #333;
			background-color: $COL_BG_REG;
		}

		&.active:not(.temp), &.hl-3 {
			filter: drop-shadow(0 0 0.5em black);
			background-color: yellow !important;
			color: black !important;

			// transform: scale(1.25);
			// display: inline-block;
		}

		&.hl-status-registered {
			filter: brightness(25%);
		}

		// For debugging highlight overlaps
		// To work, must have experimental browser features enabled
		// &:has(.highlight) {
		// 	background-color: blue !important;
		// 	color: white !important;
		// }
	}
</style>