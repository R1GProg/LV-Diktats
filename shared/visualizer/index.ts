import { onClickMistake, onEnterMistake, onLeaveMistake, onResize, registerClickHandler } from "./visualizerEvents";

export type Bounds = {
	start: number;
	end: number;
};

export type MistakeType = "ORTHO" | "PUNCT" | "TEXT";

export interface SubmissionMistake {
	id: string,
	mistakeType: MistakeType,
	bounds: ExportedSubmissionMistakeBounds[],
	description: string,
	submissionStatistic: number,
	percentage: number,
	typeCounter: {
		ortho: number,
		punct: number
	}
}

export interface ExportedSubmissionMistakeBounds {
	type: "ADD" | "DEL",
	bounds: Bounds
}

export interface GradedSubmission {
	author: string,
	text: string,
	isRejected: boolean,
	mistakes: SubmissionMistake[]
}

interface BoundsMistakeSet {
	bounds: ExportedSubmissionMistakeBounds,
	mistake: SubmissionMistake
}

export function renderCorrect(containerId: string, jsonData: GradedSubmission, embedCSS = true) {
	if (embedCSS) injectCSS();

	if (jsonData.isRejected) {
		const element = `<div class="visualisation">
	<link rel="preconnect" href="https://fonts.googleapis.com"/>
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
	<link href="https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz@8..144&display=swap" rel="stylesheet"/>
	<div class="left">
		<span class="fieldName">Pateicamies par Jūsu dalību VIII pasaules diktātā latviešu valodā! <br> Diemžēl nevarējām izlabot Jūsu darbu, jo tas bija pārāk atšķirīgs no oriģināla. <br> Tas, iespējams, saistīts ar diakritisko zīmju trūkumu vai arī diktāts bija uzrakstīts tikai daļēji.</span>
	</div>
</div>`
		document.getElementById(containerId)!.innerHTML = element;
		return;
	}

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
	boundMistakeList.sort((x, y) => x.bounds.bounds.start - y.bounds.bounds.start);

	// console.table(boundMistakeList);

	// Generate the graded text by wrapping all mistakes with spans
	for (const boundsMistakeSet of boundMistakeList) {
		const start = boundsMistakeSet.bounds.bounds.start;
		const end = boundsMistakeSet.bounds.bounds.end;
		const mistake = boundsMistakeSet.mistake;
		const original = jsonData.text.substring(start, end);
		// console.log(jsonData.text.charAt(end));
		// console.log(original);
		const modified = `<span class="mistake bound${boundsMistakeSet.bounds.type} ${mistake.id}" data-mid="${mistake.id}" data-description="${mistake.description.replace(/\"/g, "&quot;")}" data-stat="${mistake.submissionStatistic}" data-percent="${mistake.percentage}" data-type="${mistake.mistakeType}">${original}</span>${jsonData.text.charAt(end).match(/(\.|,|!|\?)/) ? "" : " "}`;
		resultingText = resultingText.substring(0, start + offset) + modified + resultingText.substring(end + offset);
		// console.log(boundsMistakeSet.bounds);
		// console.log(original);
		// console.log(mistake.description);
		// console.log("<br/>");
		offset += modified.length - original.length;
	}
	const total = jsonData.mistakes.map(x => x.typeCounter.ortho + x.typeCounter.punct).reduce((x, y, i) => x + y);
	// Visualisation HTML
	const element = `<div class="visualisation">
	<link rel="preconnect" href="https://fonts.googleapis.com"/>
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
	<link href="https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz@8..144&display=swap" rel="stylesheet"/>
	<div class="tooltip hiddenTooltip" id="tooltip">
    <div class="line"></div>
    <div class="desc">placeholder description</div>
    <div class="type">Kļūdas tips:</div>
    <div class="footer">Kļūda fiksēta 0 (0%) darbos</div>
</div>
	<div class="head">
		<div class="left">
			<span class="fieldName">Ortogrāfijas kļūdas:</span><br>${jsonData.mistakes.map(x => x.typeCounter.ortho).reduce((x, y, i) => x + y)}<br>
			<span class="fieldName">Interpunkcijas kļūdas:</span><br>${jsonData.mistakes.map(x => x.typeCounter.punct).reduce((x, y, i) => x + y)}
		</div>
		<div class="right">
			<span class="fieldName">Kopā:</span><br>${total} ${total > 1 ? "kļūdas" : "kļūda"}
		</div>
	</div>
	<div class="submission">
		<div class="text">
			${resultingText.replace(/\n/g, "<br/>")}
		</div>
	</div>
</div>`;

	document.getElementById(containerId)!.innerHTML = element; // Set container's innerHTML to the visualisation document
	// Script that generates mistake rectangles once the entire div is generated (approx. 50ms after, which should be more than enough time for the innerHTML to set)
	setTimeout(() => {
		onResize();
		const mistakes = document.getElementById(containerId)!.getElementsByClassName("mistake");
		Array.prototype.forEach.call(mistakes, (mistakeElement: HTMLElement) => {
			// onclick="onClickMistake(this, '${mistake.id}', event)" onmouseenter="onEnterMistake(event, this, '${mistake.description.replace(/\"/g, "&quot;")}', ${mistake.submissionStatistic}, ${mistake.percentage}, '${mistake.mistakeType}', '${mistake.id}')" onmouseleave="onLeaveMistake('${mistake.id}')"
			mistakeElement.addEventListener("click", (ev) => {
				onClickMistake(mistakeElement, mistakeElement.dataset["mid"]!, ev as MouseEvent);
			});
			mistakeElement.addEventListener("mouseenter", (ev) => {
				onEnterMistake(ev as MouseEvent, mistakeElement, mistakeElement.dataset["description"]!, parseInt(mistakeElement.dataset["stat"]!), parseFloat(mistakeElement.dataset["percent"]!), mistakeElement.dataset["type"]! as MistakeType, mistakeElement.dataset["mid"]!)
			});
			mistakeElement.addEventListener("mouseleave", (ev) => {
				onLeaveMistake(mistakeElement.dataset["mid"]!)
			});
		});
		registerClickHandler();
	}, 0);
}

/**
<div hidden class="tooltip">
	<div class="line"></div>
	<div class="desc">Šādi izskatās kļūda</div>
	<div class="footer">Kļūda fiksēta 1234 (69%) darbos</div>
</div>
 */

function injectCSS() {
	const css = require("fs").readFileSync("./visualizer.css", 'utf8');
	const styleEl = document.createElement("style");
	styleEl.innerHTML = css;

	document.getElementsByTagName("head")[0].appendChild(styleEl);
}