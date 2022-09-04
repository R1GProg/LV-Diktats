<script lang="ts">
	import type Action from "@shared/diff-engine/build/Action";
	import { onMount, createEventDispatcher } from "svelte";
	import { v4 as uuidv4 } from "uuid";
	import { actionRegister } from "$lib/ts/actionRegister";
	import HighlightTooltip from "$lib/components/HighlightTooltip.svelte";
	export let editable = false;
	export let text = "";
	export let diff: Action[] = [];
	let textContainer: HTMLElement;
	let svelteClass: string;
	let tooltip: HighlightTooltip;

	let textToHTMLIndexTranslation: Record<number, number> = {};
	let highlightHTMLBuffer: string = "";

	const dispatcher = createEventDispatcher();

	export function getText() {
		return textContainer.textContent;
	}

	export function highlightText(start: number, length: number, styleID: number, statusID: number, pregenId = "") {
		if (start > text.length) return;
		if (highlightHTMLBuffer === "") highlightHTMLBuffer = textContainer.innerHTML;

		const id = pregenId === "" ? uuidv4() : pregenId;
		const parsedStartIndex = textIndexToHTMLIndex(start);
		const parsedEndIndex = textIndexToHTMLIndex(start + length);
		const html = highlightHTMLBuffer;
		const tag1 = `<span class="highlight hl-${styleID} hl-status-${statusID} ${svelteClass}" data-highlight_id="${id}">`;
		const tag2 = `</span>`;
		const content = html.substring(parsedStartIndex, parsedEndIndex);
		const newHTML = `${html.substring(0, parsedStartIndex)}${tag1}${content}${tag2}${html.substring(parsedEndIndex)}`;

		highlightHTMLBuffer = newHTML;

		shiftTextToHTMLTranslation(start, tag1.length);
		shiftTextToHTMLTranslation(start + length, tag2.length);

		return id;
	}

	function addHighlightedText(newText: string, start: number, styleID: number, statusID: number, pregenId = "") {
		if (highlightHTMLBuffer === "") highlightHTMLBuffer = textContainer.innerHTML;
		const id = pregenId === "" ? uuidv4() : pregenId;
		const tag = `<span class="highlight hl-${styleID} hl-status-${statusID} ${svelteClass} tag-ignore" data-highlight_id="${id}">${newText}</span>`;

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

	async function onErrorHighlightMouseEnter(el: HTMLElement, err: Action) {
		// if (!err.inRegister) return;
		// tooltip.setTooltip(el, (await actionRegister.getActionDescriptor(err.hash)).desc);
	}

	function onErrorHighlightMouseLeave() {
		if (tooltip.isActive()) tooltip.clearTooltip();
	}

	function highlightErrors() {
		// Create the highlight elements
		for (const error of diff) {
			// const statusId = error.inRegister ? 1 : 0;
			const statusId = 0;
			
			switch (error.type) {
				case "ADD":
					{ // In a block to scope the variable definition
						let char = error.char;

						if (error.char === "\n") {
							char = `\\n\n`;
						}

						addHighlightedText(char, error.indexCheck, 2, statusId, error.id);
					}
					break;
				case "DEL":
					// Do error.char.length instead of 1, as error.char may contain spaces
					highlightText(error.indexCheck, error.char.length, 1, statusId, error.id);
					break;
				case "SUB":
					console.log(error);
					highlightText(error.indexCheck, error!.charBefore!.length, 0, statusId, error.id);
					break;
				default:
					continue;
			}
		}

		commitHighlightBuffer();

		// Add event listeners to the tags
		for (const err of Object.values(diff)) {
			const id = err.id;
			const el = textContainer.querySelector<HTMLSpanElement>(`span[data-highlight_id="${id}"]`);

			if (!el) {
				console.warn(`Unable to add event listener to highlight tag! UUID=${id}, Action=${JSON.stringify(err)}`);
				continue;
			}

			el.addEventListener("mouseenter", () => {
				dispatcher("errorenter", { id: err.id });
				onErrorHighlightMouseEnter(el, err);
			});

			el.addEventListener("mouseleave", () => {
				dispatcher("errorleave", { id: err.id });
				onErrorHighlightMouseLeave();
			});

			el.addEventListener("click", () => {
				dispatcher("errorclick", { id: err.id });
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

	export function setPlainText(newText: string) {
		text = newText;
		textContainer.innerHTML = newText;
	}

	export function initTextToHTMLTranslation() {
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

	export function setHighlightActive(id: string, tooltip = false) {
		const el = textContainer.querySelector<HTMLElement>(`[data-highlight_id="${id}"]`);

		if (!el) {
			console.warn(`Attempt to set active a highlight with an unknown ID ${id}`);
			return;
		}

		el.scrollIntoView({ behavior: "smooth" });
		el.classList.add("active");

		if (tooltip) {
			onErrorHighlightMouseEnter(el, diff.find((a) => a.id === id)!);
		}
	}

	function removeHighlight(id: string) {
		const regex = new RegExp(`<span class="highlight .+?" data-highlight_id="${id}">((?:.|\n)+)<\/span>`);
		textContainer.innerHTML = textContainer.innerHTML.replace(regex, "$1");
	}

	export function clearAllActiveHighlights(clearShift = false) {
		for (const el of textContainer.querySelectorAll<HTMLElement>(".highlight.active")) {
			if (el.classList.contains("temp")) {
				removeHighlight(el.dataset.highlight_id!);
			} else {
				el.classList.remove("active");
			}
		}

		if (clearShift) initTextToHTMLTranslation();
		if (tooltip.isActive()) tooltip.clearTooltip();
	}

	export function setTextActive(start: number, length: number, style = 3) {
		const id = highlightText(start, length, style, 0);
		commitHighlightBuffer();

		const el = document.querySelector<HTMLElement>(`.highlight[data-highlight_id="${id}"]`)!;
		el.classList.add("active", "temp");

		el.scrollIntoView({ behavior: "smooth"});
	}

	onMount(() => {
		actionRegister.loadActionRegister();
		svelteClass = textContainer.className.match(/s-.+?( |$)/)![0].trim();

		initTextToHTMLTranslation();
	});
</script>

<div class="textbox">
	<span class="container" bind:this={textContainer} contenteditable={editable} spellcheck="false">{text}</span>

	<!-- A stupid workaround to avoid Svelte style purging for the dynamically added elements -->
	<span class=".highlight hl-0 hl-1 hl-2 hl-3 hl-status-1 active"></span>
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