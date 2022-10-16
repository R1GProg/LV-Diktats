import fse from "fs-extra";
import Diff, { Bounds, DiffONP, Mistake, MistakeHash } from "@shared/diff-engine";
import path from "path";
import { Submission, SubmissionID, Workspace } from "@shared/api-types";
import genDataset from "./genDataset";
import { processString } from "@shared/normalization";

const SAVE_TEMP = false;

const tempDir = path.join(__dirname, "temp");
const inputDir = path.join(__dirname, "data");
const outputDir = path.join(__dirname, "output");
const workspaceInPath = path.join(inputDir, "output.json");
const rawDataPath = path.join(inputDir, "data-prod.csv");
const templatePath = path.join(inputDir, "template-new.txt");
const tempWorkspaceOut = path.join(tempDir, "ws.json");
const workspaceOutPath = path.join(outputDir, "output.json");

export type RawWorkspace = Workspace & { submissions: Record<SubmissionID, Submission> };

function calcAdjustmentMap(originalTemplate: string, newTemplate: string): number[] {
	const diff = new DiffONP(originalTemplate.split(""), newTemplate.split(""));
	diff.calc();

	console.log(diff.getSequence());

	return diff.getSequence().map((c) => c.indexCheck);
}

function calcAdjustmentAmount(index: number, map: number[]) {
	return map.filter((v) => v <= index).length;
}

function addBoundOffset(b: Bounds, offset: number): Bounds {
	return {
		start: b.start + offset,
		end: b.end + offset,
	}
}

(async () => {
	await fse.ensureDir(inputDir);
	await fse.ensureDir(outputDir);

	let ws: RawWorkspace;
	let template: string;

	try {
		ws = await fse.readJSON(workspaceInPath);
		template = await fse.readFile(templatePath, "utf-8");
	} catch (err) {
		console.error(err);
		return;
	}

	const adjMap = calcAdjustmentMap(template, processString(template));
	const hashMap: Record<MistakeHash, MistakeHash> = {}; // New : Old

	for (const subm of Object.values(ws.submissions)) {
		for (const m of subm.data.mistakes) {
			const offset = calcAdjustmentAmount(m.boundsCorrect.start, adjMap);
			m.boundsCorrect = addBoundOffset(m.boundsCorrect, offset);

			const origHash = m.hash;
			const newHash = await Mistake.fromData(m).genHash(true);

			hashMap[newHash] = origHash;
		}
	}

	let newWorkspace: RawWorkspace;

	// if (fse.existsSync(tempWorkspaceOut) && SAVE_TEMP) {
	// 	newWorkspace = await fse.readJSONSync(tempWorkspaceOut);
	// } else {
	// 	newWorkspace = await genDataset(await fse.readFile(rawDataPath, "utf-8"), template);

	// 	if (SAVE_TEMP) {
	// 		fse.ensureDirSync(tempDir)
	// 		fse.writeJSONSync(tempWorkspaceOut, newWorkspace);
	// 	}
	// }

	// console.log(`Before: ${Object.keys(hashMap).length}`);

	// for (const subm of Object.values(newWorkspace.submissions)) {
	// 	for (const m of subm.data.mistakes) {
	// 		if (m.hash in hashMap) {
	// 			delete hashMap[m.hash];
	// 		}
	// 	}
	// }

	// console.log(`After: ${Object.keys(hashMap).length}`);
})();