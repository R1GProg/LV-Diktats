let hold = false;

function onEnterMistake(ev, parent, id) {
  if (hold) return;
  let tooltip = document.getElementById(id);
  let rect = parent.getBoundingClientRect();
  tooltip.style.top = rect.y - 124 + "px";
  tooltip.style.left = rect.x + "px";
  tooltip.hidden = false;
}

function onLeaveMistake(ev, id) {
  if (hold) return;
  let tooltip = document.getElementById(id);
  tooltip.hidden = true;
}

function onClickMistake(elem) {
  hold = !hold;
  if (hold) elem.style.background = "#FFB74D";
  if (!hold) {
    Array.prototype.forEach.call(
      document.getElementsByClassName("tooltip"),
      (el) => {
        el.hidden = true;
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
