import DiffONP, { MistakeData } from "@shared/diff-engine";
import { parse } from "csv-parse";
import { processString } from "@shared/normalization";
import { logger } from "yatsl";
import { Submission, SubmissionID, Workspace } from "@shared/api-types";
import { RawWorkspace } from ".";

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

export default async function genDataset(csv: string, template: string): Promise<RawWorkspace> {
	const submissions: Record<SubmissionID, Submission> = {};

	const records = await new Promise<CSVSubmission[]>((res, rej) => {
		parse(csv, {
			delimiter: ",",
			from_line: 2,
			columns: ["id", "email", "text"]
		}, async (err, records: CSVSubmission[]) => {
			if (err) {
				logger.error(err);
				rej();
				return;
			}

			res(records);
		});
	});

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

	const outputWorkspace: RawWorkspace = {
		id: "debugworkspaceid",
		name: "Krāsaina saule virs pelēkiem jumtiem",
		template,
		submissions: submissions as any,
		register: [],
		local: true
	};

	logger.info("CSV parsed!");
	return outputWorkspace;
}
