/*
- Merge mistakes
	- Auto-merge for all submissions
- Unmerge mistakes
	- Auto-unmerge for all submissions
*/

import { Submission } from "@shared/api-types";
import { Mistake, MistakeHash } from "@shared/diff-engine";

export namespace Merge {
	// Modifies the submissions by reference
	export async function merge(affectedSubmissions: Submission[], mistakes: MistakeHash[]) {
		const parsePromises: Promise<void>[] = [];
		
		for (const subm of affectedSubmissions) {
			parsePromises.push(new Promise<void>(async (res) => {
				const subMistakes = subm.data.mistakes;
				const targetSubMistakes = subMistakes
					.filter((m) => mistakes.includes(m.hash))
					.map((m) => Mistake.fromData(m));
				
				const mergedMistake = Mistake.mergeMistakes(...targetSubMistakes);
				
				for (const prevMistake of targetSubMistakes) {
					subMistakes.splice(subMistakes.findIndex((m) => m.id === prevMistake.id), 1);
				}
				
				subMistakes.push(await mergedMistake.exportData());
				subMistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
				
				res();
			}));
		}
		
		await Promise.all(parsePromises);
	}
	
	// Modifies the submissions by reference
	export async function unmerge(affectedSubmissions: Submission[], targetMistake: MistakeHash) {
		const parsePromises: Promise<void>[] = [];
		
		for (const subm of affectedSubmissions) {
			parsePromises.push(new Promise<void>(async (res) => {
				const subMistakes = subm.data.mistakes;
				const targetSubMistake = subMistakes.findIndex((m) => m.hash === targetMistake)!;
				const unmergedMistakes = Mistake.unmergeMistake(Mistake.fromData(subMistakes[targetSubMistake]));
				
				subMistakes.splice(targetSubMistake, 1);
				
				subMistakes.push(...await Promise.all(unmergedMistakes.map((m) => m.exportData())));
				subMistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
				
				res();
			}));
		}
		
		await Promise.all(parsePromises);
	}
}