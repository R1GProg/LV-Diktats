import fs from 'fs';
import { parseCSV, readWorkspaceFromDisk, writeWorkspaceToDB, writeWorkspaceToDisk } from './services/DatasetManager';
import path from 'path';

async function generateDataset() {
	let dataset = await parseCSV(
		fs.readFileSync(path.join(__dirname, "../data/data.csv"), "utf8"),
		fs.readFileSync(path.join(__dirname, "../data/correct.txt"), "utf8"),
		"debug",
		"Debug Dataset");
	writeWorkspaceToDisk(path.join(__dirname, "../data/dataset.json"), dataset);
}

// TODO: Move this to some testing file.
async function writeToDb() {
	let dataset = readWorkspaceFromDisk(path.join(__dirname, "../data/dataset.json"));
	writeWorkspaceToDB(dataset);
}

// generateDataset();
writeToDb();