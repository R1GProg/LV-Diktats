let hold = false;
const yOffset = -10;
let timeout = null;

function setTooltipText(description, count, percentage) {
  const tooltip = document.getElementById("tooltip");
  tooltip.getElementsByClassName("desc")[0].innerHTML = description;
  tooltip.getElementsByClassName(
    "footer"
  )[0].innerHTML = `Kļūda fiksēta ${count} (${
    Math.floor(percentage * 1000) / 10
  }%) darbos`;
}

function onEnterMistake(parent, description, count, percentage) {
  if (hold) return;
  if (timeout !== null) clearTimeout(timeout);
  setTooltipText(description, count, percentage);
  let tooltip = document.getElementById("tooltip");
  let rect = parent.getBoundingClientRect();
  tooltip.style.top = rect.y - 124 + yOffset + window.scrollY + "px";
  tooltip.style.left = rect.x + window.scrollX + "px";
  tooltip.classList.remove("hiddenTooltip");
}

function onLeaveMistake() {
  if (hold) return;
  let tooltip = document.getElementById("tooltip");
  tooltip.classList.add("hiddenTooltip");
  if (timeout !== null) clearTimeout(timeout);
  timeout = setTimeout(() => {
    tooltip.style.top = "-420vh";
    tooltip.style.left = "-69vw";
  }, 250);
}

function onClickMistake(elem) {
  hold = !hold;
  if (hold) elem.style.background = "#FFB74D";
  if (!hold) {
    let tooltip = document.getElementById("tooltip");
    tooltip.classList.add("hiddenTooltip");
    Array.prototype.forEach.call(
      document.getElementsByClassName("mistake"),
      (el) => {
        el.style.background = "#F86060";
      }
    );
  }
}
