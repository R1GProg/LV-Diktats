const submissions = Object.create(null);
const dropdown = document.getElementById("submissions");

fetch("./VisData.json")
  .then((response) => response.json())
  .then((json) => {
    let elements = [];
    for (const key in json) {
      submissions[key] = json[key];
      let newElement = document.createElement("option");
      newElement.innerHTML = `${key} (${json[key].id})`;
      elements.push(newElement);
    }

    const vals = Object.values(submissions);
    let i = 0;

    const intObj = setInterval(() => {
      if (i % 50 === 0) console.log(i);

      try {
        visualizer.renderCorrect(
          "container",
          vals[i++].data
        );
      } catch (err) {
        console.log("ERROR: ", i - 1);
        clearInterval(intObj);
      }
    }, 300);

    // elements.sort(
    //   (a, b) =>
    //     parseInt(a.innerHTML.split(" ")[1].replace(/[()]/g, "")) -
    //     parseInt(b.innerHTML.split(" ")[1].replace(/[()]/g, ""))
    // );

    // elements.forEach((a) => dropdown.appendChild(a));

    // const params = new URLSearchParams(document.location.search);
    // if (params.has("id") && params.get("id").split(" ")[0] in submissions) {
    //   dropdown.value = params.get("id");
    //   visualizer.renderCorrect(
    //     "container",
    //     submissions[params.get("id").split(" ")[0]].data
    //   );
    // }
  });
