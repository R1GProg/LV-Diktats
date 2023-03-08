import type { RegisterEntry, Submission, Workspace } from "@shared/api-types";
import { countValidMistakes, getRegisterEntry, getAllSubmissionsWithMistakes } from "./util";
import Papa from "papaparse";
import type { Bounds, Mistake, MistakeData, MistakeHash, MistakeType } from "@shared/diff-engine";

export interface StatisticsEntry {
	title: string;
	key: string;
	type: "NUMBER" | "CSV";
	calc: (dataset: Workspace) => string | number;
}

export interface StatisticsData {
	title: string;
	key: string;
	type: "NUMBER" | "CSV";
	data: string | number;
}

function getPunctMistakeContext(text: string, bounds: Bounds, padding=20) {
	const start = text.substring(bounds.start - padding, bounds.start);
	const mid = text.substring(bounds.start, bounds.end);
	const end = text.substring(bounds.end, bounds.end + padding);

	return `${start}<${mid}>${end}`.replace(/\n/g, "<br>");
}

function normFraction(fract: number) {
	return Number(fract.toFixed(3));
}

function calcMergedCorrectBounds(m: MistakeData): Bounds {
	if (m.subtype !== "MERGED") return m.boundsCorrect

	let lowestStart = Infinity;
	let highestEnd = 0;

	for (const c of m.children) {
		if (c.boundsCorrect.start < lowestStart) lowestStart = c.boundsCorrect.start;
		if (c.boundsCorrect.end > highestEnd) highestEnd = c.boundsCorrect.end;
	}

	return { start: lowestStart, end: highestEnd };
}

function countIncorrectWords(dataset: Workspace) {
	const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
	const wordMistakes: Record<string, number> = {}; // Word : mistake count

	for (const subm of validSubms) {
		const submCountedMistakes: string[] = [];

		for (const m of subm.data.mistakes) {
			if (m.type !== "MIXED") continue;

			const word = m.wordCorrect!.trim();

			if (submCountedMistakes.includes(word)) continue;

			const regEntry = getRegisterEntry(m.hash, dataset.register);

			if (regEntry === null) continue;
			if (regEntry.opts.ignore) continue;
			if (regEntry.opts.mistakeType !== "ORTHO") continue;

			if (!(word in wordMistakes)) wordMistakes[word] = 0;

			submCountedMistakes.push(word);
			wordMistakes[word]++;
		}
	}

	return wordMistakes;
}

export const statisticsTemplate: StatisticsEntry[] = [
	{
		title: "Kopā iesūtīti darbi",
		key: "totalSubmissions",
		type: "NUMBER",
		calc: (dataset) => Object.keys(dataset.submissions).length
	},
	{
		title: "Kopā iesūtīti pilni darbi",
		key: "totalValidSubmissions",
		type: "NUMBER",
		calc: (dataset) => Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED").length
	},
	{
		title: "Kopā izlaboti darbi",
		key: "totalGraded",
		type: "NUMBER",
		calc: (dataset) => Object.values(dataset.submissions).filter((s) => s.state === "DONE").length
	},
	{
		title: "Kļūdas viskļūdainākajā darbā",
		key: "maxMistakes",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			let wrongestSubm: Submission | null = null;
			let mistakeCount = Infinity;

			for (const subm of validSubms) {
				const count = countValidMistakes(subm, dataset.register);

				if (wrongestSubm === null || mistakeCount < count) {
					wrongestSubm = subm;
					mistakeCount = count;
				}
			}

			return mistakeCount === Infinity ? NaN : mistakeCount;
		}
	},
	{
		title: "Perfekti darbi",
		key: "perfectSubms",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			let perfectCount = 0;

			for (const subm of validSubms) {
				if (countValidMistakes(subm, dataset.register) === 0) perfectCount++;
			}

			return perfectCount;
		}
	},
	{
		title: "Kļūdas pēc ID",
		key: "mistakesById",
		type: "CSV",
		calc: (dataset) => {
			const subms = Object.values(dataset.submissions) as unknown as Submission[];
			const outputData = subms.map((s) => ({
				id: s.id,
				mistakes: countValidMistakes(s, dataset.register),
				state: s.state
			}));

			return Papa.unparse(outputData, { newline: "\n" });
		}
	},
	{
		title: "Darbi ar 3 vai mazāk kļūdām",
		key: "almostPerfectSubms",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			let submCount = 0;

			for (const subm of validSubms) {
				let submOk = true;
				let mistakeCount = 0;

				for (const m of subm.data.mistakes) {
					const regEntry = getRegisterEntry(m.hash, dataset.register);

					if (regEntry === null) continue;
					if (regEntry.opts.ignore) continue;

					mistakeCount++;

					if (mistakeCount > 3) {
						submOk = false;
						break;
					}
				}

				if (submOk) submCount++;
			}

			return submCount;
		}
	},
	{
		title: "Pareizrakstības kļūdas: viskļūdainākie vārdi",
		key: "mostIncorrectWords",
		type: "CSV",
		calc: (dataset) => {
			const wordMistakes = countIncorrectWords(dataset);
			const outData = Object.keys(wordMistakes).map((k) => ({
				word: k,
				mistakeCount: wordMistakes[k]
			}));

			return Papa.unparse(outData, { newline: "\n" });
		}
	},
	{
		title: "Pareizrakstības kļūdas: tik % to riskanto vārdu uzrakstīja pareizi",
		key: "mostIncorrectWordsPercentageCorrect",
		type: "CSV",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			const wordMistakes: Record<string, number> = {}; // Word : mistake count

			for (const subm of validSubms) {
				const submCountedMistakes: string[] = [];

				for (const m of subm.data.mistakes) {
					if (m.type !== "MIXED") continue;

					const word = m.wordCorrect!.trim();

					if (submCountedMistakes.includes(word)) continue;

					const regEntry = getRegisterEntry(m.hash, dataset.register);

					if (regEntry === null) continue;
					if (regEntry.opts.ignore) continue;
					if (regEntry.opts.mistakeType !== "ORTHO") continue;

					if (!(word in wordMistakes)) wordMistakes[word] = 0;

					submCountedMistakes.push(word);
					wordMistakes[word]++;
				}
			}

			const outData = Object.keys(wordMistakes).map((k) => ({
				word: k,
				fractionCorrect: normFraction((validSubms.length - wordMistakes[k]) / validSubms.length)
			}));

			return Papa.unparse(outData, { newline: "\n" });
		}
	},
	{
		title: "Pieturzīmju kļūdas: Kļūdainākās pieturzīmes",
		key: "mostIncorrectPunct",
		type: "CSV",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];

			const delMistakes: Record<string, { count: number, punct: string, context: string }> = {};
			const addMistakes: Record<string, { count: number, punct: string, context: string }> = {};
			const mixedMistakes: Record<string, { count: number, punct: string, context: string }> = {};

			for (const subm of validSubms) {
				for (const m of subm.data.mistakes) {
					const regEntry = getRegisterEntry(m.hash, dataset.register);

					if (regEntry === null) continue;
					if (regEntry.opts.ignore) continue;
					if (regEntry.opts.mistakeType !== "PUNCT") continue;

					const key = m.boundsCorrect.start.toString();

					switch (m.type) {
						case "DEL":
							if (!(key in delMistakes)) {
								delMistakes[key] = {
									count: 0,
									punct: m.word,
									context: getPunctMistakeContext(subm.data.text, m.boundsCheck)
								};
							}
	
							delMistakes[key].count++;
							break;
						case "ADD":
							if (!(key in addMistakes)) {
								addMistakes[key] = {
									count: 0,
									punct: m.word,
									context: getPunctMistakeContext(dataset.template, m.boundsCorrect)
								};
							}
	
							addMistakes[key].count++;
							break;
						case "MIXED":
							if (!(key in mixedMistakes)) {
								mixedMistakes[key] = {
									count: 0,
									punct: m.wordCorrect!,
									context: getPunctMistakeContext(dataset.template, m.boundsCorrect)
								};
							}
	
							mixedMistakes[key].count++;
							break;
					}
				}
			}

			const mixedData = Object.keys(mixedMistakes).map((k) => ({
				start: k,
				punct: mixedMistakes[k].punct,
				mistakeCount: mixedMistakes[k].count,
				type: "MIXED",
				context: mixedMistakes[k].context
			}));

			const delData = Object.keys(delMistakes).map((k) => ({
				start: k,
				punct: delMistakes[k].punct,
				mistakeCount: delMistakes[k].count,
				type: "DEL",
				context: delMistakes[k].context
			}));

			const addData = Object.keys(addMistakes).map((k) => ({
				start: k,
				punct: addMistakes[k].punct,
				mistakeCount: addMistakes[k].count,
				type: "ADD",
				context: addMistakes[k].context
			}));

			const outData = [ ...delData, ...addData, ...mixedData ];

			// A bit of PP
			for (const e of outData) {
				if (e.punct === " ") e.punct = "\\s";
			}

			return Papa.unparse(outData, { newline: "\n" });
		}
	},
	{
		title: "Darbi bez virsraksta (%)",
		key: "submsWithoutTitle",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			
			// Just check whether the submission includes "Krāsaina saule virs pelēkiem jumtiem"
			// It doesn't take into account possible misspellings of the title, but it mostly works

			let count = 0;

			for (const subm of validSubms) {
				if (!subm.data.text.includes("Krāsaina saule virs pelēkiem jumtiem")) count++;
			}

			return normFraction(count / validSubms.length);
		}
	},
	{
		title: "Darbi bez autora (%)",
		key: "submsWithoutAuthor",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			const regId = "a8e67f93-6ffb-494d-b039-1cf749c678e3";
			const regEntry = dataset.register.find((e) => e.id === regId);

			let count = 0;

			for (const m of new Set(regEntry!.mistakes)) {
				count += getAllSubmissionsWithMistakes(validSubms, [ m ]).length;
			}

			return normFraction(count / validSubms.length);
		}
	},
	{
		title: "Pieturzīmju variācijas",
		key: "punctVariations",
		type: "CSV",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			const ignorePunctEntriesRaw = dataset.register.filter((e) => e.opts.ignore && e.opts.mistakeType === "PUNCT");
			const ignorePunctEntries: RegisterEntry[] = [];

			// Filter out stray entries
			// Pretty hacky, but fine for a one-time thing

			for (const entry of ignorePunctEntriesRaw) {
				let valid = true;
				const desc = entry.description.toLowerCase();

				if (
					desc.includes("rindkopa")
					|| desc.includes("saprot")
					|| desc.includes("atstarp")
					|| desc.includes("pēdiņ")
					|| desc.includes("virsrakst")
				) valid = false;

				for (const word of Object.values(entry._mistakeWords!)) {
					if (
						word.includes("\n")
						|| word.includes("\"")
					) {
						valid = false;
						break;
					}
				}

				if (valid) ignorePunctEntries.push(entry);
			}

			// Count all occurences
			const outputData: { desc: string, count: number, context: string }[] = [];

			for (const entry of ignorePunctEntries) {
				let count = 0;
				let context: string | null = null;

				for (const m of entry.mistakes) {
					const submArr = getAllSubmissionsWithMistakes(validSubms, [ m ]);
					
					if (context === null) {
						const exampleSubm = dataset.submissions[submArr[0]] as unknown as Submission;
						const mistake = exampleSubm.data.mistakes.find((submMistake) => submMistake.hash === m)!;
						
						if (mistake.type === "DEL") {
							context = getPunctMistakeContext(exampleSubm.data.text, mistake.boundsCheck, 30);
						} else {
							context = getPunctMistakeContext(dataset.template, mistake.boundsCorrect, 30);
						}
					}

					count += submArr.length;
				}

				outputData.push({
					count,
					desc: entry.description,
					context: context!,
				});
			}

			return Papa.unparse(outputData, { newline: "\n" });
		}
	},
	{
		title: "Cik pavisam dažādas pareizrakstības kļūdas",
		key: "orthoMistakes",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			const entryId = "a8f8bedb-09cb-478f-aaac-9fa6c08443de"; // Vardu pareizrakstiba
			const regEntry = dataset.register.find((e) => e.id === entryId);
			let count = 0;

			for (const m of new Set(regEntry!.mistakes)) {
				count += getAllSubmissionsWithMistakes(validSubms, [ m ]).length;
			}

			return count;
		}
	},
	{
		title: "10 populārāko pareizrakstību kļūdu tops (% darbos)",
		key: "topMistakes",
		type: "CSV",
		calc: (dataset) => {
			// Top 10 word mistakes and their top 5 variations
			const mistakeCount = 10;
			const variationCount = 10;

			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			const mistakes: Record<string, {
				word: string,
				variations: Record<string, { count: number, word: string }>,
				count: number
			}> = {};
			
			for (const subm of validSubms) {
				const submCountedVariations: string[] = [];

				for (const m of subm.data.mistakes) {
					if (m.type !== "MIXED") continue;

					const word = m.wordCorrect!.trim();
					const variation = m.word.trim();

					if (submCountedVariations.includes(variation)) continue;

					const regEntry = getRegisterEntry(m.hash, dataset.register);

					if (regEntry === null) continue;
					if (regEntry.opts.ignore) continue;
					if (regEntry.opts.mistakeType !== "ORTHO") continue;

					if (!(word in mistakes)) {
						mistakes[word] = { word, variations: {}, count: 0 };
					}

					mistakes[word].count++;

					if (!(variation in mistakes[word].variations)) {
						mistakes[word].variations[variation] = { word: variation, count: 0 };
					}

					mistakes[word].variations[variation].count++;

					submCountedVariations.push(variation);
				}
			}

			const mistakeVals = Object.values(mistakes);
			mistakeVals.sort((a, b) => b.count - a.count);
			const topMistakes = mistakeVals.slice(0, mistakeCount);

			const outputData: {
				word: string,
				totalCount: number,
				variation: string,
				variationCount: number,
				variationFract: number,
			}[] = [];

			for (const mistake of topMistakes) {
				const variations = Object.values(mistake.variations);
				variations.sort((a, b) => b.count - a.count);
				const topVariations = variations.slice(0, variationCount);

				for (const v of topVariations) {
					outputData.push({
						word: mistake.word,
						totalCount: mistake.count,
						variation: v.word,
						variationCount: v.count,
						variationFract: normFraction(v.count / validSubms.length)
					});
				}
			}

			return Papa.unparse(outputData, { newline: "\n" });
		}
	},
	{
		title: "Kopējais kļūdu skaits",
		key: "mistakeCount",
		type: "NUMBER",
		calc: (dataset) => {
			const validSubms = Object.values(dataset.submissions).filter((s) => s.state !== "REJECTED") as unknown as Submission[];
			let count = 0;

			for (const subm of validSubms) {
				count += subm.data.mistakes.length;
			}

			return count;
		}
	}
];