import { charIsWordDelimeter } from "./langUtil";
import { Action } from "./Action";
import { Bounds, Mistake } from "./Mistake";
import DiffONP, { DiffAction } from "./DiffONP";

export interface WordItem {
	content: string,
	index: number,
	type: "WORD" | "PUNCT"
}

export interface DiffOpts {
	printSubAddCharacters: boolean,
	// printNewLineCharacters: boolean
}

// const NEWLINE_CHAR = "⏎";

export default class Diff {
	// Edit script tracking
	private checkText: string = "";
	private correctText: string = "";
	private mistakes: Mistake[] = [];
	private diffAlg: DiffONP<WordItem>;

	private checkSequence: WordItem[] | null = null;
	private correctSequence: WordItem[] | null = null;
	private printSubAddCharacters = true;
	private opts: DiffOpts = {
		printSubAddCharacters: true,
		// printNewLineCharacters: true
	};

	private rawSequence: DiffAction<WordItem>[] | null = null;

	constructor(check: string, correct: string, opts?: Partial<DiffOpts>) {
		this.opts = { ...this.opts, ...(opts ?? {}) };
		this.setData(check, correct);

		this.diffAlg = new DiffONP<WordItem>(
			this.checkSequence ?? [],
			this.correctSequence ?? [],
			(a, b) => a.content === b.content
		);
	}

	setData(check: string, correct: string) {
		this.checkText = check;
		this.correctText = correct;

		this.checkSequence = Diff.splitText(check);
		this.correctSequence = Diff.splitText(correct);
	}

	setRawMistakes(mistakes: Mistake[]) {
		this.mistakes = mistakes;
	}

	private static splitText(text: string): WordItem[] {
		const textArr = text.split("");
		const output: WordItem[] = [];
		let index: number | null = null;
		let prevWordDelim = -1;

		while (index !== -1 || index === null) {
			index = textArr.findIndex((a, i) => charIsWordDelimeter(a) && i > prevWordDelim);

			const wordContent = textArr.slice(prevWordDelim + 1, index === -1 ? undefined : index).join("");

			// wordContent will be empty if there are 2 word delimeters in sequence
			if (wordContent !== "") {
				// Add the parsed word
				output.push({
					index: prevWordDelim + 1,
					content: wordContent,
					type: "WORD"
				});
			}

			// Add the parsed punctuation
			output.push({
				index,
				content: textArr[index],
				type: "PUNCT"
			});

			prevWordDelim = index;
		}

		return output;
	}

	calc(postprocess = true) {
		this.diffAlg.calc();
		const diffData = this.diffAlg.getSequence();
		this.rawSequence = diffData;

		if (postprocess) this.postprocess(diffData);
	}

	postprocess(diffData: DiffAction<WordItem>[]) {
		// const parsedDiff = this.opts.printNewLineCharacters ? Diff.parseNewLineChars(diffData) : diffData;

		this.mistakes = Diff.parseMistakes(diffData);
		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

		this.consolidatePunctWhitespace();
		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

		this.consolidateWordWhitespaces();
		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);

		this.parseWordSubstitutions();
		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
	}

	static parseMistakes(diffData: DiffAction<WordItem>[]) {
		// const sortedDiff = diffData.sort((a, b) => a.indexCheck - b.indexCheck);
		let delOffset = 0;
		let addOffset = 0;
		const mistakes: Mistake[] = [];

		for (const a of diffData) {
			let indexStart = a.item.index + (a.type === "ADD" ? addOffset : delOffset);

			const len = a.item.content.length;

			if (a.type === "ADD") {
				delOffset += len;
			} else {
				addOffset += len;
			}
			
			mistakes.push(new Mistake({
				type: a.type,
				subtype: a.item.type === "PUNCT" ? "OTHER" : "WORD",
				boundsDiff: { start: indexStart, end: indexStart + len },
				boundsCheck: {
					start: a.type === "DEL" ? a.item.index : a.indexCheck,
					end: a.type === "DEL" ? a.item.index + len : a.indexCheck
				},
				boundsCorrect: {
					start: a.type === "ADD" ? a.item.index : a.indexCorrect,
					end: a.type === "ADD" ? (a.item.index + len) : a.indexCorrect
				},
				word: a.item.content
			}));
		}

		return mistakes;
	}

	consolidatePunctWhitespace() {
		const punctMistakes = this.mistakes.filter((mistake) => mistake.subtype === "OTHER");

		for (let i = 0; i < punctMistakes.length - 1; i++) {
			const m = punctMistakes[i];
			const nextM = punctMistakes[i + 1];

			if (nextM.word !== " ") continue;
			if (nextM.boundsDiff.start !== m.boundsDiff.end) continue;
			if (nextM.type !== m.type) continue;

			// Special case for em dash
			if (m.word === "—") {
				m.word = ` ${m.word}`;
				m.boundsDiff.start--;
				m.boundsCheck.start--;
				m.boundsCorrect.start--;
			} else {
				m.word = `${m.word} `;
				m.boundsDiff.end = nextM.boundsDiff.end;
				m.boundsCheck.end = nextM.boundsCheck.end;
				m.boundsCorrect.end = nextM.boundsCorrect.end;
			}

			this.mistakes.splice(this.mistakes.findIndex((sm) => sm.id === nextM.id), 1);
		}
	}

	consolidateWordWhitespaces() {
		for (let i = 0; i < this.mistakes.length - 1; i++) {
			const curMistake = this.mistakes[i];

			if (curMistake.subtype === "OTHER") continue;

			const nextMistake = this.mistakes[i + 1];

			if (nextMistake.word !== " ") continue;
			if (curMistake.type !== nextMistake.type) continue;

			curMistake.word += " ";
			curMistake.boundsDiff.end++;

			if (curMistake.type === "ADD") {
				curMistake.boundsCorrect.end++;
			} else if (curMistake.type === "DEL") {
				curMistake.boundsCheck.end++;
			}

			// Changing the array you are iterating - very safe /s
			this.mistakes.splice(i + 1, 1);
		}
	}

	parseWordSubstitutions() {
		for (let i = 0; i < this.mistakes.length; i++) {
			const m = this.mistakes[i];

			// Match proceeding same-subtype mistakes
			const nextWordIndex = this.mistakes.findIndex((mistake, index) => mistake.subtype === m.subtype && index > i);

			if (nextWordIndex === -1) continue;

			const nextM = this.mistakes[nextWordIndex];

			// To form a SUB mistake, an ADD and a DEL must be next to each other
			if (m.type === nextM.type) continue;

			let punctMistakeLength = 0;
			const punctMistakesInMiddle = nextWordIndex - i - 1;

			for (let j = i + 1; j < nextWordIndex; j++) {
				punctMistakeLength += this.mistakes[j].word.length;
			}

			// If the next word doesnt start right after all punctuation mistakes,
			// it is not a valid substitution mistake
			if (m.boundsDiff.end + punctMistakeLength !== nextM.boundsDiff.start) continue;

			// Assume valid substitution mistake past this point

			const addMistake = m.type === "ADD" ? m : nextM;
			const delMistake = m.type === "ADD" ? nextM : m;

			// Diff the words and generate the actions
			const actions: Action[] = [];

			const delWordSplit: WordItem[] = delMistake.word
				.split("")
				.map((c, index) => ({ content: c, index, type: "WORD" }));
			const addWordSplit: WordItem[] = addMistake.word
				.split("")
				.map((c, index) => ({ content: c, index, type: "WORD" }));

			const wordDiff = new DiffONP<WordItem>(
				delWordSplit,
				addWordSplit,
				(a, b) => a.content === b.content
			);
			wordDiff.calc();
			const wordDiffSeq = wordDiff.getSequence();

			let addOffset = 0;
			let delOffset = 0;

			for (const a of wordDiffSeq) {
				const indexDiff = a.item.index + (a.type === "ADD" ? addOffset : delOffset);

				if (a.type === "ADD") {
					delOffset++;
				} else {
					addOffset++;
				}

				actions.push(new Action({
					type: a.type,
					char: a.item.content,
					indexCheck: a.indexCheck,
					indexCorrect: a.indexCorrect,
					indexDiff,
					subtype: m.subtype === "WORD" ? "ORTHO" : "PUNCT",
				}));
			}

			// The sub mistake will be in place of the leftmost mistake
			const subBounds: Bounds = {
				start: m.boundsDiff.start,
				end: m.boundsDiff.start + delMistake.word.length + actions.filter((a) => a.type === "ADD").length,
			};

			const subMistake = new Mistake({
				type: "MIXED",
				subtype: m.subtype,
				boundsDiff: subBounds,
				boundsCheck: delMistake.boundsCheck,
				boundsCorrect: addMistake.boundsCorrect,
				actions,
				word: delMistake.word,
				wordCorrect: addMistake.word
			});

			// It's probably not the best idea to modify the array
			// you are iterating, but ¯\_(ツ)_/¯
			this.mistakes.splice(i, 1, subMistake);
			this.mistakes.splice(nextWordIndex, 1);

			const adjIndex = this.opts.printSubAddCharacters ? actions.filter((a) => a.type === "ADD").length : 0;

			// Adjust boundsDiff of all punctuation in the middle of the sub
			// to compensate for the possible difference in length of the previous
			// leftmost ADD mistake
			for (let j = i + 1; j <= i + punctMistakesInMiddle; j++) {
				const mistake = this.mistakes[j];
				const deltaIndex = Math.abs(delMistake.word.length - addMistake.word.length);

				mistake.boundsDiff.start += deltaIndex;
				mistake.boundsDiff.end += deltaIndex;
			}

			// Decrement boundsDiff of all subsequent words
			// to compensate for the removal of the ADD mistake
			for (let j = nextWordIndex; j < this.mistakes.length; j++) {
				const mistake = this.mistakes[j];
				const deltaIndex = addMistake.word.length - adjIndex;

				mistake.boundsDiff.start -= deltaIndex;
				mistake.boundsDiff.end -= deltaIndex;
			}
		}
	}

	getMistakes() {
		return this.mistakes;
	}

	getDistance() {
		return this.mistakes.length;
	}

	getRawSequence() {
		return this.rawSequence;
	}
}

export * from "./Mistake";
export * from "./Action";
export { default as DiffONP } from "./DiffONP";
