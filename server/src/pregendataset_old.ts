import DiffONP, { MistakeData } from '@shared/diff-engine';
import { parse } from 'csv-parse';
import { processString } from '@shared/normalization';
import fs from "fs";
import path from "path";
import { logger } from "yatsl";
import { Submission, SubmissionData, SubmissionID, SubmissionPreview, Workspace } from '@shared/api-types';

// interface CSVSubmission {
// 	id: number;
// 	created_at: string;
// 	message: string;
// 	age: number;
// 	language: string;
// 	language_other: string;
// 	level: string;
// 	degree: string;
// 	country: string;
// 	city: string;
// };

interface CSVSubmission {
	id: number;
	email: string;
	text: string;
};

async function parseshitdicksv2() {
	let csv = fs.readFileSync(path.join(__dirname, "..", "data", "data-2023-min.csv"), "utf16le");
	const template = processString(fs.readFileSync(path.join(__dirname, "..", "data", "correct-2023.txt"), "utf8"));

	const submissions: Record<SubmissionID, Submission> = {};

	parse(csv, {
		delimiter: ',',
		from_line: 1,
		quote: "\"",
		relax_column_count: true,
		columns: ["id", "email", "text"]
	}, async (err, records: CSVSubmission[], info) => {
		if (err) {
			logger.error(err);
			return;
		}

		for (const val of records) {
			val.text = processString(val.text);
			const diff = new DiffONP(val.text, template);
			diff.calc();

			const id = val.id.toString();
			const mistakes = diff.getMistakes();
			const mistakeData: MistakeData[] = await Promise.all(mistakes.map((m) => m.exportData()));

			const curSub: Submission = {
				id,
				state: "UNGRADED",
				data: {
					text: val.text,
					ignoreText: [],
					mistakes: mistakeData,
					splitMistakes: [],
					metadata: {
						email: val.email
					}
				}
			};

			submissions[id] = curSub;

			logger.info(`Processed submission #${val.id}!`);
		}

		const outputWorkspace: Workspace = {
			id: "diktats2023",
			name: "Izdomāt diktātu",
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