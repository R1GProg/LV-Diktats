import { charIsWordDelimeter } from "./langUtil";
import { Action } from "./Action";
import { Mistake } from "./Mistake";
import DiffONP, { DiffAction } from "./DiffONP";
import { logger } from "yatsl";

export interface WordItem {
	content: string,
	index: number,
	type: "WORD" | "PUNCT"
}

export default class Diff {
	// Edit script tracking
	private checkText: string = "";
	private correctText: string = "";
	private mistakes: Mistake[] = [];
	private diffAlg: DiffONP<WordItem>;

	private checkSequence: WordItem[] | null = null;
	private correctSequence: WordItem[] | null = null;

	constructor(check: string, correct: string) {
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

	calc() {
		this.diffAlg.calc();
		const diffData = this.diffAlg.getSequence();
		this.postprocess(diffData);
	}

	private postprocess(diffData: DiffAction<WordItem>[]) {
		this.mistakes = Diff.parseMistakes(this.checkText, diffData);
		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
		this.parseWordSubstitutions();
		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
	}

	private static parseMistakes(text: string, diffData: DiffAction<WordItem>[]) {
		// const sortedDiff = diffData.sort((a, b) => a.indexCheck - b.indexCheck);
		let checkTextCopy = text;
		let delOffset = 0;
		let addOffset = 0;
		const mistakes: Mistake[] = [];

		for (const a of diffData) {
			let indexStart = a.item.index + (a.type === "ADD" ? addOffset : delOffset);

			const len = a.item.content.length;
			const contentBefore = checkTextCopy.substring(0, indexStart);
			const contentAfter = checkTextCopy.substring(indexStart);

			if (a.type === "ADD") {
				checkTextCopy = `${contentBefore}${a.item.content}${contentAfter}`;
				delOffset += len;
			} else {
				addOffset += len;
			}
			
			mistakes.push(new Mistake({
				type: a.type,
				subtype: a.item.type === "PUNCT" ? "OTHER" : "WORD",
				boundsDiff: { start: indexStart, end: indexStart + len },
				boundsCheck: {
					start: a.indexCheck,
					end: a.indexCheck + (a.type === "DEL" ? len : 0)
				},
				boundsCorrect: {
					start: a.indexCorrect,
					end: a.indexCorrect + (a.type === "ADD" ? len : 0)
				},
				word: a.item.content
			}));
		}

		return mistakes;
	}

	private parseWordSubstitutions() {
		for (let i = 0; i < this.mistakes.length; i++) {
			const m = this.mistakes[i];

			// Match proceeding same-subtype mistakes
			const nextWordIndex = this.mistakes.findIndex((mistake, index) => mistake.subtype === m.subtype && index > i);

			// If no words are after the current word, just break
			if (nextWordIndex === -1) break;

			const nextM = this.mistakes[nextWordIndex];

			// To form a SUB mistake, an ADD and a DEL must be next to each other
			if (m.type === nextM.type) continue;

			const punctMistakesInMiddle = nextWordIndex - i - 1;

			// If the next word doesnt start right after all punctuation mistakes,
			// it is not a valid substitution mistake
			if (m.boundsDiff.end + punctMistakesInMiddle !== nextM.boundsDiff.start) continue;

			// Assume valid substitution mistake past this point

			const addMistake = m.type === "ADD" ? m : nextM;
			const delMistake = m.type === "ADD" ? nextM : m;

			// The sub mistake will be in place of the leftmost mistake
			let subBounds = m.boundsDiff;
			if (m.type === "ADD") {
				subBounds.end += delMistake.word.length - addMistake.word.length;
			}

			// Diff the words and generate the actions
			const actions: Action[] = [];

			const wordDiff = new DiffONP<string>(delMistake.word.split(""), addMistake.word.split(""));
			wordDiff.calc();
			const wordDiffSeq = wordDiff.getSequence();

			for (const el of wordDiffSeq) {
				actions.push(new Action({
					type: el.type,
					char: el.item,
					indexCheck: el.indexCheck + delMistake.boundsCheck!.start,
					indexCorrect: el.indexCorrect + addMistake.boundsCorrect!.start,
					indexDiff: el.type === "DEL" ? el.indexCheck + subBounds.start : undefined,
					subtype: m.subtype === "WORD" ? "ORTHO" : "PUNCT",
				}));
			}

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

			this.mistakes.splice(i, 1, subMistake);
			this.mistakes.splice(nextWordIndex, 1);

			// Adjust boundsDiff of all punctuation in the middle of the sub
			// to compensate for the possible difference in length of the previous
			// leftmost ADD mistake
			if (m.type === "ADD") {
				for (let j = i; j < i + punctMistakesInMiddle; j++) {
					const mistake = this.mistakes[j];
					const deltaIndex = delMistake.word.length - addMistake.word.length;

					mistake.boundsDiff.start += deltaIndex;
					mistake.boundsDiff.end += deltaIndex;
				}
			}

			// Decrement boundsDiff of all subsequent words
			// to compensate for the removal of the ADD mistake
			for (let j = nextWordIndex; j < this.mistakes.length; j++) {
				const mistake = this.mistakes[j];
				const deltaIndex = addMistake.word.length;

				mistake.boundsDiff.start -= deltaIndex;
				mistake.boundsDiff.end -= deltaIndex;
			}
		}
	}

	getMistakes() {
		return this.mistakes;
	}
}

export * from "./Mistake";
export * from "./Action";

(async () => {
	const check = "Test Hellw, test world!";
	const correct = "Test Hello: test worldw!";

	const d = new Diff(check, correct);
	d.calc();

	for (const m of d.getMistakes()) {
		logger.info(await m.genHash());
	}
})();
