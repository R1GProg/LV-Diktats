let hold = false;
const yOffset = -20; // tooltip::after height + line height
let timeout = null;

function getCont() {
	return document.getElementsByClassName("visualisation")[0];
}

// A check to see whether the site is being accessed on a touchscreen device
function is_touch_enabled() {
	return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function getScrollXY(elem) {
	let scrOfX = 0,
		scrOfY = 0;
	let el = elem;
	do {
		if (el.scrollLeft !== undefined) scrOfX += el.scrollLeft;
		if (el.scrollTop !== undefined) scrOfY += el.scrollTop;
		el = el.parentNode;
	} while (el);
	return [scrOfX, scrOfY];
}

function setTooltipText(description, count, percentage, mistakeType) {
	const tooltip = document.getElementById("tooltip");
	const percent = Math.floor(percentage * 1000) / 10;
	tooltip.getElementsByClassName("desc")[0].innerHTML = description;
	tooltip.getElementsByClassName("footer")[0].innerHTML =
		count >= 0 ? `Kļūda fiksēta ${count} (${percent >= 0.1 ? percent : "<0.1"}%) darbos` : ``;
	let typeStr = "";
	switch (mistakeType) {
		case "ORTHO":
			typeStr = "Ortogrāfijas";
			break;
		case "PUNCT":
			typeStr = "Interpunkcijas";
			break;
		case "TEXT":
			typeStr = "Trūkstošs Teksts";
			break;
	}
	tooltip.getElementsByClassName("type")[0].innerHTML = `Kļūdas tips: ${typeStr}`;
}

function onEnterMistake(ev, parent, description, count, percentage, mistakeType, id) {
	Array.prototype.forEach.call(getCont().getElementsByClassName(id), (element) =>
		element.classList.add("mistakeHovered")
	);
	if (hold) return;
	if (timeout !== null) clearTimeout(timeout);
	setTooltipText(description, count, percentage, mistakeType);
	let tooltip = document.getElementById("tooltip");
	const rect = parent.getBoundingClientRect();
	const containerRect = getCont().getBoundingClientRect();
	const rootRect = tooltip.parentNode.parentNode;
	const scroll = getScrollXY(parent);

	tooltip.style.top = `${rect.y - tooltip.offsetHeight + yOffset + scroll[1] - containerRect.top}px`;
	tooltip.style.left = `${ev.clientX + scroll[0] - containerRect.left}px`;
	tooltip.classList.remove("hiddenTooltip");
}

function onLeaveMistake(id) {
	Array.prototype.forEach.call(getCont().getElementsByClassName(id), (element) =>
		element.classList.remove("mistakeHovered")
	);
	if (hold) return;
	let tooltip = document.getElementById("tooltip");
	tooltip.classList.add("hiddenTooltip");
	if (timeout !== null) clearTimeout(timeout);
	timeout = setTimeout(() => {
		tooltip.style.top = "-420vh";
		tooltip.style.left = "-69vw";
	}, 250);
}

let lastElem = null;
function onClickMistake(elem, id, ev) {
	if (is_touch_enabled()) {
		if (lastElem !== null) {
			const evt = new Event("mouseleave");
			evt.clientX = ev.clientX;
			evt.clientY = ev.clientY;
			lastElem.dispatchEvent(evt);
		}
		const evt = new Event("mouseenter");
		evt.clientX = ev.clientX;
		evt.clientY = ev.clientY;
		elem.dispatchEvent(evt);
		lastElem = elem;
	} else {
		hold = !hold;
		if (hold) {
			// elem.style.background = "#FFB74D55";
			Array.prototype.forEach.call(
				getCont().getElementsByClassName(id),
				(element) => (element.style.background = "#FFB74D55")
			);
		}
		if (!hold) {
			let tooltip = document.getElementById("tooltip");
			tooltip.classList.add("hiddenTooltip");
			Array.prototype.forEach.call(getCont().getElementsByClassName("mistake"), (el) => {
				el.style.background = "#F8606055";
			});
			const evt = new Event("mouseenter");
			evt.clientX = ev.clientX;
			evt.clientY = ev.clientY;
			elem.dispatchEvent(evt);
		}
	}
}

function onClickAnythingElse(ev) {
	if (!is_touch_enabled()) return;
	if (lastElem !== null) {
		const evt = new Event("mouseleave");
		evt.clientX = ev.clientX;
		evt.clientY = ev.clientY;
		lastElem.dispatchEvent(evt);
	}
}

function onResize() {
	const mistakeLines = getCont().getElementsByClassName("mistakeLine");
	Array.prototype.forEach.call(mistakeLines, (el) => {
		el.remove();
	});
	const mistakes = getCont()
		.getElementsByClassName("submission")[0]
		.getElementsByClassName("mistake");
	const doneYLevels = [];
	Array.prototype.forEach.call(mistakes, (el) => {
		const rect = el.getBoundingClientRect();
		if (doneYLevels.includes(rect.y)) return;
		getCont()
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
}

window.addEventListener("resize", () => onResize());
new ResizeObserver(onResize);
getCont().addEventListener("click", function (evt) {
	//   if (!is_touch_enabled()) return;
	let target = evt.target;
	do {
		if (target.classList?.contains("mistake")) {
			return;
		}
		target = target.parentNode;
	} while (target);
	onClickAnythingElse(evt);
});
