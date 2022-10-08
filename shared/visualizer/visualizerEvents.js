let hold = false;
const yOffset = -10;

function onEnterMistake(ev, parent, id) {
  if (hold) return;
  let tooltip = document.getElementById(id);
  let rect = parent.getBoundingClientRect();
  tooltip.style.top = rect.y - 124 + yOffset + window.scrollY + "px";
  tooltip.style.left = rect.x + window.scrollX + "px";
  tooltip.classList.remove("hiddenTooltip");
}

function onLeaveMistake(ev, id) {
  if (hold) return;
  let tooltip = document.getElementById(id);
  tooltip.classList.add("hiddenTooltip");
}

function onClickMistake(elem) {
  hold = !hold;
  if (hold) elem.style.background = "#FFB74D";
  if (!hold) {
    Array.prototype.forEach.call(
      document.getElementsByClassName("tooltip"),
      (el) => {
        el.classList.add("hiddenTooltip");
      }
    );
    Array.prototype.forEach.call(
      document.getElementsByClassName("mistake"),
      (el) => {
        el.style.background = "#F86060";
      }
    );
  }
}
