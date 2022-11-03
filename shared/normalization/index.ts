export function processString(text: string) {
	return text
		// Debug
		// .replace(/[A-z]/g, "^")
		// Quotation marks
		.replace(new RegExp(String.fromCharCode(160), "g"), " ")
		.replace(/['`´<>“”‘’«»‟‹›„]/g, "\"")
		// De-duplicate quotation marks
		.replace(/(?:\"+|\" *\")([^\"]*[\.\?,!]+)(?:\"+|\" *\")(?! \"( |$))/gm, "\"$1\"")		
		// Turn ,,Quote" into "Quote"
		.replace(/(?:,\s?,\s?)([^\"\.\?!]*[\.\?!,]+)(?:\s*")/g, "\"$1\"")
		// Clean up whitespaces
		.replace(/\n\s+/g, "\n") // remove any whitespace after newlines
		.replace(/\s+\n/g, "\n") // remove any spaces before newlines
		.replace(/\s+$/g, "")
		.replace(/\" +([^\"]+) +\"/g, "\"$1\"") // Remove excess whitespace
		// Space quotes
		.replace(/(?:(?<!^) *(\"[^\"]*\") *(?!$))|(?:(?<!^) *(\"[^\"]*\") *)|(?: *(\"[^\"]*\") *(?!$))/gm,
			(match, g1, g2, g3) => g1 !== undefined ? ` ${g1} ` : (g2 !== undefined ? ` ${g2}` : `${g3} `)) // Depending on which matching group is defined, add spaces accordingly
		// Clean up newlines
		.replace(/((\r\n)|(\n))+/g, "\n") // Turn \n\r -> \n and remove any extra newlines (we only need one)
		// Ellipses
		.replace(/\.[ ]?\.[ ]?\.?[ ]?/g, "…")
		// Clean up double comas
		.replace(/,+/g, ',')
		// Add space to punctuation
		.replace(/((?<!"[^"]*?)\.(?![\.\s]?$))|(\.(?![\.\s\"]?))|((?<=^[^"]*)\.(?![\.\s]?$))/gm, ". ") // Add space after dot, if none
		.replace(/((?<!"[^"]*?),(?![\s]?$))|(,(?![\s\"]?))|((?<=^[^"]*),(?![\s]?$))/gm, ", ") // Add space after coma, if none
		.replace(/((?<!"[^"]*?)\?(?![\s]?$))|(\?(?![\s\"]?))|((?<=^[^"]*)\?(?![\s]?$))/gm, "? ") // Add space after question mark, if none
		.replace(/((?<!"[^"]*?)!(?![\s]?$))|(!(?![\s\"]?))|((?<=^[^"]*)!(?![\s]?$))/gm, "! ") // Add space after exclamation mark, if none
		.replace(/(?<=[^\s])[-–—]/g, " -") // Add space before dash, if lacking
		.replace(/[-–—](?=[^\s\.])/g, "- ") // Add space after dash, if lacking
		// Remove space before stops
		.replace(/\s+([\.\?!…])/g, '$1')
		// Turn hyphens and en dashes into em dashes
		.replace(/[-–]/g, '—')
		// Title fix
		.replace(/"?Krāsaina saule virs pelēkiem jumtiem"?\.?/, (x) => x.replace(/"/g, '').replace('.', '')) // Remove the title being in quotes
		.replace(/(?<=Zebris)((\.\s)|(,\s)|(\s—\s)|\s)+(?=Krāsaina)/, "\n") // Replace Author, Title with Author
									   							 		  //                            Title
		.replace(/ {2,}/g, " ")
		// Space Quotation Marks
		.replace(/(?<="[^\s]{0})"(?=[^"\n])/g, " \"")
		// Space characters after closing quotation mark
		.replace(/(?<=(\.|\?|!|,)"[^\s]{0})[^\s](?=[^"\n])/g, x => ' ' + x);
}
