export function processString(text: string) {
	return text
		// Debug
		// .replace(/[A-z]/g, "^")
		// Clean up whitespaces
		.replace(/\n\s+/g, "\n") // remove any whitespace after newlines
		.replace(/\s+\n/g, "\n") // remove any spaces before newlines
		// Clean up newlines
		.replace(/((\r\n)|(\n))+/g, "\n") // Turn \n\r -> \n and remove any extra newlines (we only need one)
		// Ellipses
		.replace(/\.[ ]?\.[ ]?\.[ ]?/g, "…")
		// Add space to punctuation
		.replace(/\.(?=[^\s])/g, ". ") // Add space after dot, if none
		.replace(/,(?=[^\s\"])/g, ", ") // Add space after coma, if none
		.replace(/(?<=[^\s])[-–—]/g, " -") // Add space before dash, if lacking
		.replace(/[-–—](?=[^\s\.])/g, "- ") // Add space after dash, if lacking
		// Turn hyphens and en dashes into em dashes
		.replace(/[-–]/g, '—')
		// Title fix
		.replace(/"Krāsaina saule virs pelēkiem jumtiem"/, (x) => x.replace(/"/g, '')) // Remove the title being in quotes
		.replace(/(?<=[Zebris])( |(, )|( — )|(.[\n ]))(?=[Krāsaina])/, "\n") // Replace Author, Title with Author
									   							 //                            Title
		// Quotation marks
		.replace(/['`´<>“”‘’«»‟‹›„]/g, "\"")
		.replace(/ {2,}/g, " ");
}
