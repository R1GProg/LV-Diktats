import fs from 'fs';
import { parseCSV, readWorkspaceFromDisk, writeWorkspaceToDB, writeWorkspaceToDisk } from './controllers/DatasetController';
import path from 'path';
import { logger } from 'yatsl';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
import * as config from "../config.json";
import { RegisterEntry } from '@shared/api-types';
import { insertRegisterEntry } from './controllers/DatabaseController';
import { RegisterUpdatedMessagePayload } from './services/types/MessageTypes';

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

async function registerWriteTest() {
	const registerEntry: RegisterEntry = {
		id: "t",
		mistakes: ["aaa"],
		ignore: false,
		description: "aaaa",
		count: 0
	}
	const register = await insertRegisterEntry(registerEntry, "debug");
	logger.log(register);
	logger.log(register);
	if (!register) return null;
	const messagePayload: RegisterUpdatedMessagePayload = {
		workspaceId: "debug",
		data: [{
			entry: registerEntry,
			type: "ADD"
		}]
	};
	logger.log(messagePayload);
	return messagePayload;
}

// generateDataset();
mongoose.connect(`mongodb+srv://admin:${process.env["DBPASS"]}@diktatify.hpuzt56.mongodb.net/${config.dbName}?retryWrites=true&w=majority`, {}).catch((e) => {
	logger.error(e);
}).then(async () => {
	logger.info("Connected to MongoDB!");
	// writeToDb();
	await registerWriteTest();
});
