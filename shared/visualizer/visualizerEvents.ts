import { MistakeType } from ".";

let hold = false;
const yOffset = -20; // tooltip::after height + line height
let timeout: NodeJS.Timeout;

function getCont() {
	return document.getElementsByClassName("visualisation")[0];
}

// A check to see whether the site is being accessed on a touchscreen device
function is_touch_enabled() {
	return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.maxTouchPoints > 0;
}

function getScrollXY(elem: HTMLElement) {
	let scrOfX = 0,
		scrOfY = 0;
	let el = elem;
	do {
		if (el.scrollLeft !== undefined) scrOfX += el.scrollLeft;
		if (el.scrollTop !== undefined) scrOfY += el.scrollTop;
		el = el.parentNode! as HTMLElement;
	} while (el);
	return [scrOfX, scrOfY];
}

function setTooltipText(description: string, count: number, percentage: number, mistakeType: MistakeType) {
	const tooltip = document.getElementById("tooltip")!;
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

export function onEnterMistake(
	ev: MouseEvent,
	parent: HTMLElement,
	description: string,
	count: number,
	percentage: number,
	mistakeType: MistakeType,
	id: string
) {
	Array.prototype.forEach.call(
		getCont().getElementsByClassName(id),
		(element) => element.classList.add("mistakeHovered")
	);
	if (hold) return;
	if (timeout) clearTimeout(timeout);
	setTooltipText(description, count, percentage, mistakeType);
	let tooltip = document.getElementById("tooltip")!;
	const rect = parent.getBoundingClientRect();
	const containerRect = getCont().getBoundingClientRect();
	// const rootRect = tooltip.parentNode.parentNode;
	// const scroll = getScrollXY(parent);

	tooltip.style.top = `${rect.y - tooltip.offsetHeight + yOffset - containerRect.top
		}px`;
	tooltip.style.left = `${ev.clientX - containerRect.left}px`;
	tooltip.classList.remove("hiddenTooltip");
}

export function onLeaveMistake(id: string) {
	Array.prototype.forEach.call(
		getCont().getElementsByClassName(id),
		(element) => element.classList.remove("mistakeHovered")
	);
	if (hold) return;
	let tooltip = document.getElementById("tooltip")!;
	tooltip.classList.add("hiddenTooltip");
	if (timeout) clearTimeout(timeout);
	timeout = setTimeout(() => {
		tooltip.style.top = "-420vh";
		tooltip.style.left = "-69vw";
	}, 250);
}

let lastElem: HTMLElement | null = null;
export function onClickMistake(elem: HTMLElement, id: string, ev: MouseEvent) {
	if (lastElem) {
		const evt = new MouseEvent("mouseleave", { clientX: ev.clientX, clientY: ev.clientY });
		lastElem.dispatchEvent(evt);
	}
	const evt = new MouseEvent("mouseenter", { clientX: ev.clientX, clientY: ev.clientY });
	elem.dispatchEvent(evt);
	lastElem = elem;
	hold = !hold;
	if (hold) {
		// elem.style.background = "#FFB74D55";
		Array.prototype.forEach.call(
			getCont().getElementsByClassName(id),
			(element) => (element.style.background = "#FFB74D55")
		);
	} else {
		let tooltip = document.getElementById("tooltip")!;
		tooltip.classList.add("hiddenTooltip");
		Array.prototype.forEach.call(
			getCont().getElementsByClassName("mistake"),
			(el) => {
				el.style.background = "#F8606000";
			}
		);
		lastElem = null;
		const evt = new MouseEvent("mouseenter", { clientX: ev.clientX, clientY: ev.clientY });
		elem.dispatchEvent(evt);
	}
}

function onClickAnythingElse(ev: MouseEvent) {
	// if (!is_touch_enabled()) return;
	if (lastElem) {
		hold = false;
		Array.prototype.forEach.call(
			getCont().getElementsByClassName("mistake"),
			(el) => {
				el.style.background = "#F8606000";
			}
		);
		const evt = new MouseEvent("mouseleave", { clientX: ev.clientX, clientY: ev.clientY });
		lastElem.dispatchEvent(evt);
		lastElem = null;
	}
}

export function onResize() {
	const mistakes = getCont()
		.getElementsByClassName("submission")[0]
		.getElementsByClassName("mistake");
	for (const el of Array.from(getCont().querySelectorAll(".mistakeLine"))) { el.remove() }
	const doneYLevels: number[] = [];
	Array.prototype.forEach.call(mistakes, (el: HTMLElement) => {
		const rect = el.getBoundingClientRect();
		if (doneYLevels.includes(rect.y)) return;
		getCont()
			.getElementsByClassName("text")[0]
			.insertAdjacentHTML(
				"afterend",
				'<div class="mistakeLine" style="top:' +
				(el.offsetTop + el.parentElement!.offsetTop) +
				"px; height:" +
				rect.height +
				'px;"></div>'
			);
		doneYLevels.push(rect.y);
	});
}

export function registerClickHandler() {
	getCont().addEventListener("click", function (evt) {
		//   if (!is_touch_enabled()) return;
		let target = evt.target as HTMLElement;
		do {
			if (target && target.classList && target.classList.contains("mistake")) {
				return;
			}
			target = target.parentNode as HTMLElement;
		} while (target);
		onClickAnythingElse(evt as MouseEvent);
	});

	// window.addEventListener("resize", () => onResize());
	const observer = new ResizeObserver(onResize);
	observer.observe(getCont());
	// if (!resizeInterval) resizeInterval = setInterval(() => onResize(), 100);
}
