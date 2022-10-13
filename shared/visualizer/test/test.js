const submissions = Object.create(null);
const dropdown = document.getElementById("submissions");

fetch("./vis_test_data.json")
  .then((response) => response.json())
  .then((json) => {
    let elements = [];
    for (const key in json) {
      submissions[key] = json[key];
      let newElement = document.createElement("option");
      newElement.innerHTML = `${key} (${json[key].id})`;
      elements.push(newElement);
    }

    elements.sort(
      (a, b) =>
        parseInt(a.innerHTML.split(" ")[1].replace(/[()]/g, "")) -
        parseInt(b.innerHTML.split(" ")[1].replace(/[()]/g, ""))
    );

    elements.forEach((a) => dropdown.appendChild(a));

    const params = new URLSearchParams(document.location.search);
    if (params.has("id") && params.get("id").split(" ")[0] in submissions) {
      dropdown.value = params.get("id");
      visualizer.renderCorrect(
        "container",
        submissions[params.get("id").split(" ")[0]].data
      );
    }
  });

const resizeObserver = new ResizeObserver((entries) => {
  const mistakeLines = document.getElementsByClassName("mistakeLine");
  Array.prototype.forEach.call(mistakeLines, (el) => {
    el.parentNode.removeChild(el);
  });
  const mistakes = document.getElementsByClassName("mistake");
  const doneYLevels = [];
  Array.prototype.forEach.call(mistakes, (el) => {
    const rect = el.getBoundingClientRect();
    if (doneYLevels.includes(rect.y)) return;
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
});

resizeObserver.observe(document.body);