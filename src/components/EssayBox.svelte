<script lang="ts">
	import { onMount } from "svelte";
	import type { Action } from "../ts/diff";
	export let text = "";
	export let diff: Action[] = [];
	let textContainer: HTMLElement;
	let svelteClass: string;
	let textToHTMLIndexTranslation: Record<number, number> = {};

	export function highlightText(start: number, length: number, styleID: number) {
		const parsedStartIndex = textIndexToHTMLIndex(start);
		const parsedEndIndex = textIndexToHTMLIndex(start + length);
		const html = textContainer.innerHTML;

		const tag1 = `<span class="highlight hl-${styleID} ${svelteClass}">`;
		const tag2 = `</span>`;
		const newHTML = `${html.substring(0, parsedStartIndex)}${tag1}${html.substring(parsedStartIndex, parsedEndIndex)}${tag2}${html.substring(parsedEndIndex)}`;
		
		textContainer.innerHTML = newHTML;

		shiftTextToHTMLTranslation(start, tag1.length);
		shiftTextToHTMLTranslation(start + length, tag2.length);
	}

	function addHighlightedText(newText: string, start: number, styleID: number) {
		const parsedStartIndex = textIndexToHTMLIndex(start);
		const html = textContainer.innerHTML;
		const tag = `<span class="highlight hl-${styleID} ${svelteClass} tag-ignore">${newText}</span>`;
		const newHTML = `${html.substring(0, parsedStartIndex)}${tag}${html.substring(parsedStartIndex)}`;

		textContainer.innerHTML = newHTML;

		shiftTextToHTMLTranslation(start, tag.length);
	}

	function highlightErrors() {
		for (const error of diff) {
			switch (error.type) {
				case "ADD":
					const parsed = JSON.stringify(error.char); // To visualize new lines
					addHighlightedText(parsed.substring(1, parsed.length - 1), error.indexCheck, 2);
					break;
				case "DEL":
					highlightText(error.indexCheck, 1, 1);
					break;
				// case "SUB":
				// 	break;
			}
		}
	}

	export function set(newText: string, newDiff: Action[]) {
		text = newText;
		textContainer.innerHTML = newText;
		diff = newDiff;

		initTextToHTMLTranslation();

		setTimeout(() => { // Do it on the next event cycle to allow the HTML to render
			highlightErrors();
		}, 100);
	}

	function initTextToHTMLTranslation() {
		for (let i = 0; i < text.length; i++) {
			textToHTMLIndexTranslation[i] = i;
		}
	}

	function shiftTextToHTMLTranslation(startIndex: number, shiftNumber: number) {
		console.log("shift");
		
		for (let i = startIndex; i < text.length; i++) {
			textToHTMLIndexTranslation[i] += shiftNumber;
		}
	}

	function textIndexToHTMLIndex(index: number) {
		return textToHTMLIndexTranslation[index];
	}

	onMount(() => {
		svelteClass = textContainer.className.match(/svelte-.+?( |$)/)[0].trim();
	});
</script>

<div class="textbox">
	<span class="container" bind:this={textContainer}>{text}</span>

	<!-- A stupid workaround to avoid Svelte style purging for the dynamically added elements -->
	<span class=".highlight hl-0 hl-1 hl-2"></span>
</div>

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
	}
</style>