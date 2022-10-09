const fs = require("fs");

export type Bounds = {
	start: number;
	end: number;
};

export type MistakeType = "ORTHO" | "PUNCT" | "MERGED";

export interface SubmissionMistake {
	id: string,
	mistakeType: MistakeType,
	bounds: Bounds[],
	description: string,
	submissionStatistic: number,
	percentage: number
}

export interface GradedSubmission {
	author: string,
	text: string,
	mistakes: SubmissionMistake[]
}

interface BoundsMistakeSet {
	bounds: Bounds,
	mistake: SubmissionMistake
}

export function renderCorrect(containerId: string, jsonData: GradedSubmission) {
	injectCSS();

	let resultingText = jsonData.text;
	let offset = 0;
	// Map mistakes to their bounds so they can be sorted by bound start.
	const boundMistakeList = [];
	for (const mistake of jsonData.mistakes) {
		for (const bounds of mistake.bounds) {
			boundMistakeList.push({ bounds, mistake });
		}
	}

	// Sort bounds in an ascending order
	boundMistakeList.sort((x, y) => x.bounds.start - y.bounds.start);

	// console.table(boundMistakeList);

	// Generate the graded text by wrapping all mistakes with spans
	for (const boundsMistakeSet of boundMistakeList) {
		const start = boundsMistakeSet.bounds.start;
		const end = boundsMistakeSet.bounds.end;
		const mistake = boundsMistakeSet.mistake;
		const original = jsonData.text.substring(start, end);
		// console.log(original);
		const modified = `<span class="mistake ${mistake.id}" onclick="onClickMistake(this, '${mistake.id}', event)" onmouseenter="onEnterMistake(event, this, '${mistake.description.replace(/\"/g, "&quot;")}', ${mistake.submissionStatistic}, ${mistake.percentage}, '${mistake.id}')" onmouseleave="onLeaveMistake('${mistake.id}')">${original}</span>`;
		resultingText = resultingText.substring(0, start + offset) + modified + resultingText.substring(end + offset);
		// console.log(boundsMistakeSet.bounds);
		// console.log(original);
		// console.log(mistake.description);
		// console.log("<br/>");
		offset += modified.length - original.length;
	}
	// Visualisation HTML
	const element = `<div class="visualisation">
	<link rel="preconnect" href="https://fonts.googleapis.com"/>
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
	<link href="https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz@8..144&display=swap" rel="stylesheet"/>
	<div class="tooltip hiddenTooltip" id="tooltip">
    <div class="line"></div>
    <div class="desc">placeholder description</div>
    <div class="footer">Kļūda fiksēta 0 (0%) darbos</div>
</div>
	<div class="left">
		<span class="fieldName">Rakstīja</span><br/>${jsonData.author}
	</div>
	<div class="right">
		<span class="fieldName">Ortogrāfijas kļūdas</span><br/>${jsonData.mistakes.filter(x => x.mistakeType === "ORTHO" || x.mistakeType === "MERGED").length}<br/>
		<span class="fieldName">Interpunkcijas kļūdas</span><br/>${jsonData.mistakes.filter(x => x.mistakeType === "PUNCT" || x.mistakeType === "MERGED").length}
	</div>
	<div class="submission">
		<div class="text">
			${resultingText.replace(/\n/g, "<br/>")}
		</div>
	</div>
</div>`;

	// Script that generates mistake rectangles once the entire div is generated (approx. 50ms after, which should be more than enough time for the innerHTML to set)
	const script = `setTimeout(() => {
		const mistakes = document.getElementsByClassName("mistake");
		const doneYLevels = [];
		Array.prototype.forEach.call(mistakes, (el) => {
			const rect = el.getBoundingClientRect();
			if(doneYLevels.includes(rect.y)) return;
			document
			.getElementsByClassName("text")[0]
			.insertAdjacentHTML(
				"afterend",
				'<div class="mistakeLine" style="top:' +
				(el.offsetTop + el.parentNode.offsetTop) +
				"px; height:" +
				rect.height +
				'px;"></div>'
			);
			doneYLevels.push(rect.y);
		});
		}, 50);`;

	document.getElementById(containerId)!.innerHTML = element; // Set container's innerHTML to the visualisation document
	eval(script); // Evaluate the line indicator generation code.
}

/**
<div hidden class="tooltip">
	<div class="line"></div>
	<div class="desc">Šādi izskatās kļūda</div>
	<div class="footer">Kļūda fiksēta 1234 (69%) darbos</div>
</div>
 */

function injectCSS() {
	const css = fs.readFileSync("./visualizer.css", 'utf8');
	const styleEl = document.createElement("style");
	styleEl.innerHTML = css;

	document.getElementsByTagName("head")[0].appendChild(styleEl);
}