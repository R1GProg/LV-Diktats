<script lang="ts">
	import { onMount } from "svelte";
	export let text = "";
	let textContainer: HTMLElement;
	let svelteClass: string;

	// Converts the raw text index to the corresponding index in the HTML of the container
	function textIndexToHTMLIndex(index: number) {
		// Calculate how many html characters are before the text index
		// Match all HTML tags in the text
		const htmlRegex = /(?<tag1><.+?>)(?<text>.+?)(?<tag2><\/.+?>)/g;
		const match = Array.from(textContainer.innerHTML.matchAll(htmlRegex));

		// Iterate until the tags between which the target index is are found
		let tagOffset = 0;

		for (const tag of match) {
			if (tag.index - tagOffset >= index) {
				// The tag if after the target index
				return index + tagOffset;
			} else if (tag.index - tagOffset + tag.groups.text.length >= index) {
				// The target index is within this tag
				return index + tagOffset + tag.groups.tag1.length;
			}

			// Calculate tag length
			tagOffset += tag[0].length - tag.groups.text.length;
		}

		return index + tagOffset;
	}

	export function highlightText(start: number, length: number, styleID: number) {
		const parsedStartIndex = textIndexToHTMLIndex(start);
		const parsedEndIndex = textIndexToHTMLIndex(start + length);
		const html = textContainer.innerHTML;
		const newHTML = `${html.substring(0, parsedStartIndex)}<span class="highlight hl-${styleID} ${svelteClass}">${html.substring(parsedStartIndex, parsedEndIndex)}</span>${html.substring(parsedEndIndex)}`;
		
		textContainer.innerHTML = newHTML;
	}

	onMount(() => {
		svelteClass = textContainer.className.match(/svelte-.{7}/)[0];
	});
</script>

<div class="textbox">
	<span class="container" bind:this={textContainer}>
		{@html text}
	</span>

	<!-- A stupid workaround to avoid Svelte style purging for the dynamically added elements -->
	<span class=".highlight hl-0 hl-1"></span>
</div>

<style lang="scss">
	.textbox {
		width: 100%;
		margin: 15vw;
		text-align: justify;
		font-size: 18pt;
		font-family: 'Times New Roman', Times, serif;
	}

	.container {
		width: 100%;
	}

	:global(.highlight) {
		cursor: pointer;
		transition: filter 0.3s;
		
		&:hover {
			filter: brightness(85%);
		}

		// !!! Note when adding new styles: add the class to the workaround span in the component body !!!
		&.hl-0 {
			color: white;
			background-color: rgba(255, 100, 0, 1);
		}

		&.hl-1 {
			color: white;
			background-color: rgba(40, 110, 180, 1);
		}
	}
</style>