<script lang="ts">
	import { onMount } from "svelte";
	import { v4 as uuidv4 } from "uuid";
	import type { Action } from "../ts/diff";
	import HighlightTooltip from "./HighlightTooltip.svelte";
	export let editable = false;
	export let text = "";
	export let diff: Action[] = [];
	let textContainer: HTMLElement;
	let svelteClass: string;
	let tooltip: HighlightTooltip;

	let textToHTMLIndexTranslation: Record<number, number> = {};
	let highlightHTMLBuffer: string = "";

	export function getText() {
		return textContainer.textContent;
	}

	export function highlightText(start: number, length: number, styleID: number) {
		if (start > text.length) return;
		if (highlightHTMLBuffer === "") highlightHTMLBuffer = textContainer.innerHTML;

		const id = uuidv4();
		const parsedStartIndex = textIndexToHTMLIndex(start);
		const parsedEndIndex = parsedStartIndex + length;
		const html = highlightHTMLBuffer;
		const tag1 = `<span class="highlight hl-${styleID} ${svelteClass}" data-highlight_id="${id}">`;
		const tag2 = `</span>`;
		const content = html.substring(parsedStartIndex, parsedEndIndex);
		const newHTML = `${html.substring(0, parsedStartIndex)}${tag1}${content}${tag2}${html.substring(parsedEndIndex)}`;

		highlightHTMLBuffer = newHTML;

		shiftTextToHTMLTranslation(start, tag1.length);
		shiftTextToHTMLTranslation(start + length, tag2.length);

		return id;
	}

	function addHighlightedText(newText: string, start: number, styleID: number) {
		if (highlightHTMLBuffer === "") highlightHTMLBuffer = textContainer.innerHTML;
		const id = uuidv4();
		const tag = `<span class="highlight hl-${styleID} ${svelteClass} tag-ignore" data-highlight_id="${id}">${newText}</span>`;

		if (start === text.length) {
			highlightHTMLBuffer += tag;
		} else {
			const parsedStartIndex = textIndexToHTMLIndex(start);
			const html = highlightHTMLBuffer;
			const newHTML = `${html.substring(0, parsedStartIndex)}${tag}${html.substring(parsedStartIndex)}`;
			highlightHTMLBuffer = newHTML;
		
			shiftTextToHTMLTranslation(start, tag.length);
		}

		return id;
	}

	function commitHighlightBuffer() {
		textContainer.innerHTML = highlightHTMLBuffer;
		highlightHTMLBuffer = "";
	}

	function highlightErrors() {
		const tagRef: Record<string, Action> = {};

		// Create the highlight elements
		for (const error of diff) {
			let id: string;

			switch (error.type) {
				case "ADD":
					{ // In a block to scope the variable definition
						let char = error.char;

						if (error.char === "\n") {
							char = `\\n\n`;
						}

						id = addHighlightedText(char, error.indexCheck, 2);
					}
					break;
				case "DEL":
					id = highlightText(error.indexCheck, 1, 1);
					break;
				case "SUB":
					id = highlightText(error.indexCheck, 1, 0);
					break;
				default:
					continue;
			}

			tagRef[id] = error;
		}

		commitHighlightBuffer();

		// Add event listeners to the tags
		for (const id of Object.keys(tagRef)) {
			const el = textContainer.querySelector<HTMLSpanElement>(`span[data-highlight_id="${id}"]`);
			const err = tagRef[id];

			if (!el) {
				console.warn(`Unable to add event listener to highlight tag! UUID=${id}, Action=${JSON.stringify(err)}`);
				continue;
			}

			el.addEventListener("mouseenter", () => {
				tooltip.setTooltip(el, JSON.stringify(err));
			});

			el.addEventListener("mouseleave", () => {
				tooltip.clearTooltip();
			});
		}
	}

	export function set(newText: string, newDiff: Action[]) {
		text = newText;
		textContainer.innerHTML = newText;
		diff = newDiff;

		initTextToHTMLTranslation();

		// Do it on the next event cycle to allow the HTML to render
		// No idea whether it is necessary, but it seems to be more consistently correct with this?
		setTimeout(() => {
			highlightErrors();
		}, 0);
	}

	function initTextToHTMLTranslation() {
		textToHTMLIndexTranslation = { 0: 0 };
	}

	// Returns the defined index that is before `index`
	function getPrevDefinedIndex(index: number) {
		return Math.max(...Object.keys(textToHTMLIndexTranslation)
			.map((k) => Number(k))
			.filter((k) => k <= index)
		);
	}

	function shiftTextToHTMLTranslation(startIndex: number, shiftNumber: number) {
		if (startIndex in textToHTMLIndexTranslation) {
			textToHTMLIndexTranslation[startIndex] += shiftNumber;
		} else {
			textToHTMLIndexTranslation[startIndex] = shiftNumber + textToHTMLIndexTranslation[getPrevDefinedIndex(startIndex)];
		}

		// Shift all indices that are after the new offset
		for (let k of Object.keys(textToHTMLIndexTranslation)) {
			const i = Number(k);

			if (startIndex >= i) continue;

			textToHTMLIndexTranslation[i] += shiftNumber;
		}
	}

	function textIndexToHTMLIndex(index: number) {
		const activeShiftIndex = getPrevDefinedIndex(index);
		return textToHTMLIndexTranslation[activeShiftIndex] + index;
	}

	onMount(() => {
		svelteClass = textContainer.className.match(/svelte-.+?( |$)/)[0].trim();

		initTextToHTMLTranslation();
	});
</script>

<div class="textbox">
	<span class="container" bind:this={textContainer} contenteditable={editable}>{text}</span>

	<!-- A stupid workaround to avoid Svelte style purging for the dynamically added elements -->
	<span class=".highlight hl-0 hl-1 hl-2"></span>
</div>

<HighlightTooltip bind:this={tooltip}/>

<style lang="scss">
	.textbox {
		border: 1px solid rgba(0,0,0,0.15);
		width: calc(100% - 10px);
		height: calc(100% - 10px);
		text-align: justify;
		font-size: 1rem;
		font-family: 'Times New Roman', Times, serif;
		overflow-y: auto;
		padding: 5px;
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
		transition: filter 0.3s;
		
		&:hover {
			filter: brightness(85%);
		}

		// !!! Note when adding new styles: add the class to the workaround span in the component body !!!
		&.hl-0 { // SUB
			color: white;
			background-color: rgb(225, 125, 50);
		}

		&.hl-1 { // DEL
			color: white;
			background-color: rgb(215, 45, 45);
		}

		&.hl-2 { // ADD
			color: black;
			background-color: rgb(60, 225, 90);
		}

		// For debugging highlight overlaps
		// To work, must have experimental browser features enabled
		&:has(.highlight) {
			background-color: blue !important;
			color: white !important;
		}
	}
</style>