<script lang="ts">
	import { onMount, createEventDispatcher } from "svelte";
	import type Highlighter from "web-highlighter";

	export let editable = false;
	export let text = "";
	let textContainer: HTMLElement;
	let highlighter: Highlighter;

	const dispatch = createEventDispatcher();

	export function getText() {
		return textContainer.textContent!;
	}

	export function getTextContainer() {
		return textContainer;
	}

	export function setPlainText(newText: string) {
		text = newText;
		textContainer.innerHTML = newText;
	}

	export function highlightRange(range: Range, ...classes: string[]) {
		const h = highlighter.fromRange(range);

		for (const c of classes) {
			highlighter.addClass(c, h.id);
		}

		return h.id;
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

	export function highlightText(offset: number, length: number, ...style: string[]) {
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

		return highlightRange(range, ...style);
	}

	export function addHighlightedText(offset: number, text: string, ...style: string[]) {
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

		return highlightRange(range, "added-text", ...style)
	}

	export function setHighlightClass(id: string, ...classes: string[]) {
		for (const c of classes) {
			highlighter.addClass(c, id);
		}
	}

	export function removeHighlightClass(id: string, ...classes: string[]) {
		for (const c of classes) {
			highlighter.removeClass(c, id);
		}
	}

	// Removes the class from any element that may have it
	export function clearAllHighlightClassInstances(targetClass: string) {
		for (const el of textContainer.querySelectorAll(`.${targetClass}`)) {
			el.classList.remove(targetClass);
		}
	}

	function onHighlightHover(id: string) {
		highlighter.addClass("hover", id);
		dispatch("highlight-hover", { id });
	}

	function onHighlightHoverOut(id: string) {
		highlighter.removeClass("hover", id);
		dispatch("highlight-hoverout", { id });
	}

	export function addHighlighterEventListener(event: string, cb: (id: string) => void) {
		highlighter.on(event, ({ id }) => {
			cb(id);
		});
	}

	export function getHighlightEls(id: string) {
		return highlighter.getDoms(id);
	}

	export function removeHighlight(id: string) {
		highlighter.remove(id);
	}

	async function initHighlighting() {
		const svelteClass = textContainer.className.match(/(s|svelte)-.+?( |$)/)![0].trim();
		const Highlighter = (await import("web-highlighter")).default;

		highlighter = new Highlighter({
			wrapTag: "span",
			$root: textContainer,
			style: {
				className: ["highlight", svelteClass]
			}
		});

		addHighlighterEventListener(Highlighter.event.HOVER, onHighlightHover);
		addHighlighterEventListener(Highlighter.event.HOVER_OUT, onHighlightHoverOut);
	}

	onMount(async () => {
		// actionRegister.loadActionRegister();

		await initHighlighting();
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
	<span class="highlight hl-0 hl-1 hl-2 hl-20 hl-21 hl-22 hl-3 hl-status-registered hl-status-ignored active hover"></span>
</div>

<style lang="scss">
	@import "../../scss/global.scss";

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

		&.hl-status-ignored {
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