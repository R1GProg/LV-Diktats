let hold = false;
const yOffset = -20; // tooltip::after height + line height
let timeout = null;

// A check to see whether the site is being accessed on a touchscreen device
function is_touch_enabled() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
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

function setTooltipText(description, count, percentage) {
  const tooltip = document.getElementById("tooltip");
  const percent = Math.floor(percentage * 1000) / 10;
  tooltip.getElementsByClassName("desc")[0].innerHTML = description;
  tooltip.getElementsByClassName("footer")[0].innerHTML =
    count >= 0
      ? `Kļūda fiksēta ${count} (${percent >= 0.1 ? percent : "<0.1"}%) darbos`
      : ``;
}

function onEnterMistake(ev, parent, description, count, percentage, id) {
  Array.prototype.forEach.call(document.getElementsByClassName(id), (element) =>
    element.classList.add("mistakeHovered")
  );
  if (hold) return;
  if (timeout !== null) clearTimeout(timeout);
  setTooltipText(description, count, percentage);
  let tooltip = document.getElementById("tooltip");
  const rect = parent.getBoundingClientRect();
  const rootRect = tooltip.parentNode.parentNode;
  const scroll = getScrollXY(parent);
  tooltip.style.top =
    rect.y -
    rootRect.offsetTop -
    tooltip.offsetHeight +
    yOffset +
    scroll[1] +
    "px";
  tooltip.style.left = ev.clientX - rootRect.offsetLeft + scroll[0] + "px";
  tooltip.classList.remove("hiddenTooltip");
}

function onLeaveMistake(id) {
  Array.prototype.forEach.call(document.getElementsByClassName(id), (element) =>
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
        document.getElementsByClassName(id),
        (element) => (element.style.background = "#FFB74D55")
      );
    }
    if (!hold) {
      let tooltip = document.getElementById("tooltip");
      tooltip.classList.add("hiddenTooltip");
      Array.prototype.forEach.call(
        document.getElementsByClassName("mistake"),
        (el) => {
          el.style.background = "#F8606055";
        }
      );
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

document.addEventListener("click", function (evt) {
  if (!is_touch_enabled()) return;
  let target = evt.target;
  do {
    if (target.classList?.contains("mistake")) {
      return;
    }
    target = target.parentNode;
  } while (target);
  onClickAnythingElse(evt);
});
