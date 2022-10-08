export type Bounds = {
	start: number;
	end: number;
};

export type MistakeType = "ORTHO" | "PUNCT" | "MERGED";

export interface SubmissionMistake {
	id: string,
	mistakeType: MistakeType,
	bounds: Bounds,
	description: string,
	submissionStatistic: number,
	percentage: number
}

export interface GradedSubmission {
	author: string,
	text: string,
	mistakes: SubmissionMistake[]
}

export function renderCorrect(containerId: string, jsonData: GradedSubmission) {
	let resultingText = jsonData.text;
	let tooltipText = "";
	let offset = 0;
	for (const mistake of jsonData.mistakes) {
		const start = mistake.bounds.start;
		const end = mistake.bounds.end;
		const original = jsonData.text.substring(start, end + 1);
		const modified = `<span class="mistake" onclick="onClickMistake(this)" onmouseenter="onEnterMistake(event, this, '${mistake.id}')" onmouseleave="onLeaveMistake(event, '${mistake.id}')">${original}</span>`;
		tooltipText += `<div hidden class="tooltip" id="${mistake.id}">
    <div class="line"></div>
    <div class="desc">${mistake.description}</div>
    <div class="footer">Kļūda fiksēta ${mistake.submissionStatistic} (${Math.floor(mistake.percentage * 100)}%) darbos</div>
</div>`
		resultingText = resultingText.substring(0, start + offset) + modified + resultingText.substring(end + offset + 1);
		// console.log(original);
		// console.log(mistake.description);
		// console.log("<br/>");
		offset += modified.length - original.length;
	}
	const element = `<div class="visualisation">
	<link rel="preconnect" href="https://fonts.googleapis.com"/>
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
	<link href="https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz@8..144&display=swap" rel="stylesheet"/>
	${tooltipText}
	<div class="left">
		<b>Rakstīja</b><br/>${jsonData.author}
	</div>
	<div class="right">
		<b>Ortogrāfijas kļūdas</b><br/>${jsonData.mistakes.filter(x => x.mistakeType === "ORTHO" || x.mistakeType === "MERGED").length}<br/>
		<b>Interpunkcijas kļūdas</b><br/>${jsonData.mistakes.filter(x => x.mistakeType === "PUNCT" || x.mistakeType === "MERGED").length}
	</div>
	<div class="submission">
		<div class="text">
			${resultingText.replace(/\n/g, "<br/>")}
		</div>
	</div>
</div>`;

	const script = `setTimeout(() => {
		const mistakes = document.getElementsByClassName("mistake");
		const doneYLevels = [];
		Array.prototype.forEach.call(mistakes, (el) => {
			const rect = el.getBoundingClientRect();
			document
			.getElementsByClassName("text")[0]
			.insertAdjacentHTML(
				"afterend",
				'<div class="mistakeLine" style="top:' +
				(el.offsetTop + 8) +
				"px; height:" +
				rect.height +
				'px;"></div>'
			);
			doneYLevels.push(rect.y);
		});
		}, 50);`;

	document.getElementById(containerId)!.innerHTML = element;
	eval(script);
}

/**
<div hidden class="tooltip">
	<div class="line"></div>
	<div class="desc">Šādi izskatās kļūda</div>
	<div class="footer">Kļūda fiksēta 1234 (69%) darbos</div>
</div>
 */