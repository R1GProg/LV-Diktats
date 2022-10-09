const browserify = require('browserify');
const tsify = require('tsify');
const fs = require('fs');
const path = require('path');

const outFile = path.join(__dirname, "build", "visualizer.bundle.js");
const visualizerEventsPath = path.join(__dirname, "visualizerEvents.js");

browserify({ standalone: "visualizer" })
    .add('index.ts')
    .plugin(tsify, { noImplicitAny: true })
	.transform("brfs")
    .bundle()
    .on('error', function (error) { console.error(error.toString()); })
    .pipe(fs.createWriteStream(outFile))
	.on("finish", () => {
		const eventScript = fs.readFileSync(visualizerEventsPath, "utf-8");
		fs.appendFileSync(outFile, eventScript);
	});
