fetch("./test.json")
  .then((response) => response.json())
  .then((json) => visualizer.renderCorrect("container", json));
