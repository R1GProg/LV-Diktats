import DiffONP, { MistakeData } from '@shared/diff-engine';
import { parse } from 'csv-parse';
import { processString } from '@shared/normalization';
import fs from "fs";
import path from "path";
import { logger } from "yatsl";
import { Submission, SubmissionData, SubmissionID, SubmissionPreview, Workspace } from '@shared/api-types';

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

async function parseshitdicksv2() {
	const csv = fs.readFileSync(path.join(__dirname, "..", "data", "data.csv"), "utf8");
	const template = processString(fs.readFileSync(path.join(__dirname, "..", "data", "correct.txt"), "utf8"));

	const submissions: Record<SubmissionID, Submission> = {};

	parse(csv, {
		delimiter: ',',
		from_line: 2,
		columns: ["id", "created_at", "message", "age", "language", "language_other", "level", "degree", "country", "city"]
	}, async (err, records: CSVSubmission[], info) => {
		if (err) {
			logger.error(err);
			return;
		}

		for (const val of records) {
			logger.info(`Beginning processing of submission #${val.id}...`);
			// TODO: generate diff and categorise mistakes
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

		const outputWorkspace: Workspace = {
			id: "debugworkspaceid",
			name: "Mazsālīto gurķu blūzs",
			template,
			submissions: submissions as any,
			register: [],
			local: true
		};
	
		fs.writeFileSync(path.join(__dirname, "output.json"), JSON.stringify(outputWorkspace));

		logger.info("CSV parsed!");
	});
}

parseshitdicksv2();