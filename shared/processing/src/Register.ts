/*
- Create register entry
- Update register entry
*/

import { RegisterEntry, RegisterEntryData, RegisterEntryMistake, SubmissionID } from "@shared/api-types";
import { MistakeHash } from "@shared/diff-engine";
import { v4 as uuidv4 } from "uuid";

export namespace Register {
	export async function create(
		data: RegisterEntryData,
		submissionSearchFunction: (hash: MistakeHash) => Promise<SubmissionID[]>
	): Promise<RegisterEntry> {
		if (data.action !== "ADD") {
			throw "Attempt to create register with invalid data";
		}

		const mistakeArr = await Promise.all(data.mistakes!.map(async (hash) => {
			const subIDs = await submissionSearchFunction(hash);

			return {
				hash,
				count: subIDs.length,
				ids: subIDs
			} as RegisterEntryMistake;
		}));

		const entry: RegisterEntry = {
			id: uuidv4(),
			mistakes: mistakeArr,
			description: data.description!,
			ignore: data.ignore!,
		};

		return entry;
	}

	export async function update(
		data: RegisterEntryData,
		prevData: RegisterEntry,
		submissionSearchFunction: (hash: MistakeHash) => Promise<SubmissionID[]>
	) {
		if (data.action !== "EDIT") {
			throw "Attempt to create register with invalid data";
		}

		const prevHashes = prevData.mistakes.map((m) => m.hash);
		const deltaMistakeHashes = data.mistakes!.filter((mHash) => !prevHashes.includes(mHash));

		const newMistakeArr = await Promise.all(deltaMistakeHashes.map(async (hash) => {
			const subIDs = await submissionSearchFunction(hash);

			return {
				hash,
				count: subIDs.length,
				ids: subIDs
			} as RegisterEntryMistake;
		}));

		const entry: RegisterEntry = {
			id: uuidv4(),
			mistakes: [ ...prevData.mistakes, ...newMistakeArr ],
			description: data.description!,
			ignore: data.ignore!,
		};

		return entry;
	}
}