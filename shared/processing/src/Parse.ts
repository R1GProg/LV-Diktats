/*
- Parse raw submission text
- Read raw CSV and parse
- Regenerate submission
*/

import { ExportedWorkspace, Submission, SubmissionID } from "@shared/api-types";
import Diff, { Bounds, Mistake, MistakeData, MistakeHash } from "@shared/diff-engine";
import { processString } from "@shared/normalization";
import { parse } from "csv-parse";
import { logger } from "yatsl";
import { v4 as uuidv4 } from "uuid";

export namespace Parse {
	export interface RawSubmission {
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
	}

	export function parseTextIgnoreBounds(rawText: string, ignoreBounds: Bounds[]) {
		let text = rawText;
		let offset = 0;
	
		for (const bounds of ignoreBounds) {
			const sub1 = text.substring(0, bounds.start - offset);
			const sub2 = text.substring(bounds.end - offset);
			text = (sub1 + sub2).trim();
	
			offset += bounds.end - bounds.start;
		}
	
		return text;
	}

	export async function parseRaw(subm: RawSubmission, template: string): Promise<Submission> {
		const normSubmText = processString(subm.message);
		const diff = new Diff(normSubmText, template);
		diff.calc();
		
		const mistakes: MistakeData[] = await Promise.all(diff.getMistakes().map((m) => m.exportData()));
		
		const parsedSubm: Submission = {
			id: subm.id.toString(),
			state: "UNGRADED",
			data: {
				text: normSubmText,
				ignoreText: [],
				mistakes,
				metadata: {
					age: subm.age,
					language: subm.language,
					language_other: subm.language_other,
					level: subm.level,
					degree: subm.degree,
					country: subm.country,
					city: subm.city
				}
			}
		};
		
		return parsedSubm;
	}

	export async function parseCSV(workspaceName: string, csv: string, template: string, progressLog = false): Promise<ExportedWorkspace> {
		const data = await new Promise<RawSubmission[]>((res, rej) => {
			parse(csv, {
				delimiter: ',',
				from_line: 2,
				columns: ["id", "created_at", "message", "age", "language", "language_other", "level", "degree", "country", "city"]
			}, async (err, records: RawSubmission[]) => {
				if (err) {
					logger.error(err);
					rej(err);
					return;
				}

				res(records);
			})
		});

		const submissions: Record<SubmissionID, Submission> = {};

		for (const val of data) {
			submissions[val.id] = await parseRaw(val, template);
				
			if (progressLog) logger.info(`Processed submission #${val.id}!`);
		}

		const outputWorkspace: ExportedWorkspace = {
			id: uuidv4(),
			name: workspaceName,
			template,
			submissions,
			register: []
		};

		return outputWorkspace;
	}
	
	export async function regenSubmission(subm: Submission, template: string): Promise<Submission> {
		const mergedMistakes = subm.data.mistakes.filter((m) => m.subtype === "MERGED");
		
		const diff = new Diff(parseTextIgnoreBounds(subm.data.text, subm.data.ignoreText), template);
		diff.calc();
		
		// Remerges all previously merged mistakes, if they are still in the diff
		const rawMistakes = diff.getMistakes();
		const hashMistakeMap: Record<MistakeHash, Mistake> = {};
		const mistakeMapPromises: Promise<void>[] = [];
		
		// Pregenerate the hashes of all mistakes
		for (const m of rawMistakes) {
			mistakeMapPromises.push(new Promise<void>(async (res) => {
				hashMistakeMap[await m.genHash()] = m;
				res();
			}));
		}
		
		await Promise.all(mistakeMapPromises);
		
		// Merge previously merged mistakes
		for (const m of mergedMistakes) {
			let stillMerged = true;
			
			// Check if all of the mistakes are still in the diff
			for (const child of m.children) {
				if (!(child.hash in hashMistakeMap)) {
					stillMerged = false;
					break;
				}
			}
			
			if (!stillMerged) continue;
			
			const mistakesToMerge = m.children.map((child) => hashMistakeMap[child.hash]);
			const mergedMistake = Mistake.mergeMistakes(...mistakesToMerge);
			
			// Remove the mistakes that were merged, add the new merged mistake
			for (const child of m.children) {
				delete hashMistakeMap[child.hash];
				hashMistakeMap[await mergedMistake.genHash()] = mergedMistake;
			}
		}
		
		const mistakes = await Promise.all(Object.values(hashMistakeMap).map((m) => m.exportData()));
		mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
		
		const submCopy = { ...subm };
		submCopy.data.mistakes = mistakes;

		return submCopy;
	}
}