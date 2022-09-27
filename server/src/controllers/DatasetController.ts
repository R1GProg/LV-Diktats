import DiffONP, { MistakeData } from '@shared/diff-engine';
import { parse } from 'csv-parse';
import { processString } from '@shared/normalization';
import fs from "fs";
import { RegisterEntry, Submission, SubmissionID } from '@shared/api-types';
import { deleteWorkspace, insertWorkspaceDataset } from './DatabaseController';
import { logger } from 'yatsl';

// Generates and saves datasets from CSV.


interface CSVSubmission {
	id: number;
	created_at: string;
	message: string;
	age: number;
	language: string;
	language_other: string;
	level: string;
	degree: string;
	country: string;
	city: string;
};

// Workspace except instead of SubmissionPreview, it's the complete Submission. This shouldn't be used outside of this file.
// insertWorkspaceDataset in DatabaseManager.ts is the only exception to this.
export interface WorkspaceDataset {
	id: string,
	name: string,
	template: string,
	submissions: Record<SubmissionID, Submission>,
	register: RegisterEntry[]
}

export async function parseCSV(csv: string, template: string, workspaceID: string, workspaceName: string): Promise<WorkspaceDataset> {

	const submissions: Record<SubmissionID, Submission> = {};

	const parser = parse(csv, {
		delimiter: ',',
		from_line: 2,
		columns: ["id", "created_at", "message", "age", "language", "language_other", "level", "degree", "country", "city"]
	});

	for await (const val of parser) {
		// logger.info(`Beginning processing of submission #${val.id}...`);
		val.message = processString(val.message);
		const diff = new DiffONP(val.message, template);
		diff.calc();

		const id = val.id.toString();
		const mistakes = diff.getMistakes();
		const mistakeData: MistakeData[] = await Promise.all(mistakes.map((m) => m.exportData()));

		const curSub: Submission = {
			id,
			state: "UNGRADED",
			data: {
				text: val.message,
				ignoreText: [],
				mistakes: mistakeData,
				metadata: {
					age: val.age,
					language: val.language,
					language_other: val.language_other,
					level: val.level,
					degree: val.degree,
					country: val.country,
					city: val.city
				}
			}
		};

		submissions[id] = curSub;

		logger.info(`Processed submission #${val.id}!`);
	}

	const outputWorkspace: WorkspaceDataset = {
		id: workspaceID,
		name: workspaceName,
		template: processString(template),
		submissions,
		register: [],
	};

	logger.info("CSV parsed!");
	return outputWorkspace;
}

export function writeWorkspaceToDisk(path: string, workspace: WorkspaceDataset) {
	fs.writeFileSync(path, JSON.stringify(workspace));
}

export function readWorkspaceFromDisk(path: string): WorkspaceDataset {
	let rawJSON = fs.readFileSync(path).toString();
	return JSON.parse(rawJSON) as WorkspaceDataset;
}

export async function writeWorkspaceToDB(workspace: WorkspaceDataset) {
	logger.info(`Deleting previous instance of Workspace ${workspace.id} (if any)...`);
	await deleteWorkspace(workspace.id);

	logger.info(`Writing Workspace ${workspace.id} to DB...`);
	await insertWorkspaceDataset(workspace);

	logger.info(`Workspace ${workspace.id} written to DB!`);
}