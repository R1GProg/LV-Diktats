<script lang="ts">
	import { onMount, createEventDispatcher } from "svelte";
	import HighlightTooltip from "$lib/components/HighlightTooltip.svelte";
	import type Highlighter from "web-highlighter";
	import type Mistake from "@shared/diff-engine/Mistake";

	export let editable = false;
	export let text = "";
	export let diff: Mistake[] = [];
	let textContainer: HTMLElement;
	let tooltip: HighlightTooltip;
	let highlighter: Highlighter;

	const dispatcher = createEventDispatcher();

	export function getText() {
		return textContainer.textContent;
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

	function highlightMistakes() {
		// Create the highlight elements
		for (const mistake of diff) {
			if (mistake.subtype === "WORD") {
				const start = mistake.boundsDiff.start;
				const end = mistake.boundsDiff.end;

				switch (mistake.type) {
					case "DEL":
						highlightText(start, end - start, "hl-0");
						break;
					case "ADD":
						addHighlightedText(start, "Hello world!", "hl-1");
						break;
					case "MIXED":
						highlightText(start, end - start, "hl-2");
						break;
				}
			} else {
				for (const action of mistake.actions) {
					switch(action.type) {
						case "DEL":
							// Do error.char.length instead of 1, as error.char may contain spaces
							highlightText(action.indexCheck, action.char.length, "hl-0");
							break;
						case "ADD":
							{ // In a block to scope the variable definition
								let char = action.char;

								if (action.char === "\n") {
									char = "\\n\n";
								}

								addHighlightedText(action.indexCheck, char, "hl-1");
							}
							break;
						case "SUB":
							highlightText(action.indexCheck, action.charBefore!.length, "hl-2");
							break;
					}
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

			if (walkedOffset + nodeLen > offset) {
				startNode = node.nodeType === Node.TEXT_NODE ? node : node.firstChild;
				startNodeIndex = i;
				break;
			} else {
				walkedOffset += nodeLen;
			}
		}

		return { node: startNode, index: startNodeIndex, offset: offset - walkedOffset };
	}

	function highlightText(offset: number, length: number, style = "") {
		if (!highlighter) {
			console.warn("Attempt to highlight before web-highlighter has been imported!");
			return;
		}

		const {
			node: startNode,
			index: startNodeIndex,
			offset: startOffset
		} = getHighlightStartNode(offset);

		if (startNode === null) {
			console.warn("Attempt to highlight out of range!");
			return;
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

		const id = highlighter.fromRange(range).id;
		
		if (style !== "") {
			highlighter.addClass(style, id);
		}
	}

	function addHighlightedText(offset: number, text: string, style = "") {
		if (!highlighter) {
			console.warn("Attempt to highlight before web-highlighter has been imported!");
			return;
		}

		const {
			node: startNode,
			index: startNodeIndex,
			offset: startOffset
		} = getHighlightStartNode(offset);

		if (startNode === null) {
			console.warn("Attempt to highlight out of range!");
			return;
		}

		const parentRange = document.createRange();
		parentRange.setStart(startNode, startOffset);

		const textNode = document.createTextNode(text);
		parentRange.insertNode(textNode);

		const range = document.createRange();
		range.setStart(textNode, 0);
		range.setEnd(textNode, text.length);

		const id = highlighter.fromRange(range).id;
		
		if (style !== "") {
			highlighter.addClass(style, id);
		}

		highlighter.addClass("added-text", id);
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
			highlighter.addClass("hover", id);
		});

		highlighter.on(Highlighter.event.HOVER_OUT, ({ id }) => {
			highlighter.removeClass("hover", id);
		});
	}

	onMount(async () => {
		// actionRegister.loadActionRegister();

		await initHighlighting();
	});
</script>

<div class="textbox">
	<span class="container" bind:this={textContainer} contenteditable={editable} spellcheck="false">{text}</span>

	<!-- A stupid workaround to avoid Svelte style purging for the dynamically added elements -->
	<span class=".highlight hl-0 hl-1 hl-2 hl-3 hl-status-1 active hover"></span>
</div>

<HighlightTooltip bind:this={tooltip}/>

<style lang="scss">
	@import "../scss/global.scss";

	.textbox {
		border: 1px solid rgba(0,0,0,0.15);
		width: calc(100% - 20px);
		height: calc(100% - 10px);
		text-align: justify;
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

		&.hover {
			filter: brightness(85%);
		}

		// !!! Note when adding new styles: add the class to the workaround span in the component body !!!
		&.hl-0 { // DEL
			color: black;
			background-color: $COL_MISTAKE_DEL;
		}

		&.hl-1 { // ADD
			color: black;
			background-color: $COL_MISTAKE_ADD;
		}

		&.hl-2 { // MIXED
			color: black;
			background-color: $COL_MISTAKE_MIXED;
		}

		&.active:not(.temp), &.hl-3 {
			filter: drop-shadow(0 0 0.5em black);
			background-color: yellow !important;
			color: black !important;

			// transform: scale(1.25);
			// display: inline-block;
		}

		&.hl-status-1 {
			filter: brightness(50%);
		}

		// For debugging highlight overlaps
		// To work, must have experimental browser features enabled
		// &:has(.highlight) {
		// 	background-color: blue !important;
		// 	color: white !important;
		// }
	}
</style>