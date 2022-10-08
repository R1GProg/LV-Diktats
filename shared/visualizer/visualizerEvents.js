let hold = false;
const yOffset = 15;
let timeout = null;

function setTooltipText(description, count, percentage) {
  const tooltip = document.getElementById("tooltip");
  const percent = Math.floor(percentage * 1000) / 10;
  tooltip.getElementsByClassName("desc")[0].innerHTML = description;
  tooltip.getElementsByClassName(
    "footer"
  )[0].innerHTML = `Kļūda fiksēta ${count} (${
    percent >= 0.1 ? percent : "<0.1"
  }%) darbos`;
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
  tooltip.style.top =
    rect.y - rootRect.offsetTop - 124 + yOffset + window.scrollY + "px";
  tooltip.style.left = ev.clientX - rootRect.offsetLeft + window.scrollX + "px";
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

function onClickMistake(elem, id, ev) {
  hold = !hold;
  if (hold) {
    // elem.style.background = "#FFB74D";
    Array.prototype.forEach.call(
      document.getElementsByClassName(id),
      (element) => (element.style.background = "#FFB74D")
    );
  }
  if (!hold) {
    let tooltip = document.getElementById("tooltip");
    tooltip.classList.add("hiddenTooltip");
    Array.prototype.forEach.call(
      document.getElementsByClassName("mistake"),
      (el) => {
        el.style.background = "#F86060";
      }
    );
    const evt = new Event("mouseenter");
    evt.clientX = ev.clientX;
    evt.clientY = ev.clientY;
    elem.dispatchEvent(evt);
  }
}
