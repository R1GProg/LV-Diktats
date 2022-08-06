import { v4 as uuidv4 } from "uuid";
import { charIsPunctuation, charIsWordDelimeter, getWordBounds } from "./langUtil";
import type { Action, Word } from "../types";
import { actionRegister } from "./actionRegister";

// The action done to go from target to source character

interface GridPoint {
	x: number,
	y: number,
	k: number | null,
}

// Based on
// https://github.com/cubicdaiya/onp/
// https://www.sciencedirect.com/science/article/abs/pii/002001909090035V
export class Diff_ONP {
	private a: string;
	private b: string;
	private m: number;
	private n: number;
	private dist: number | null = null;
	private stringsReversed: boolean;

	// Edit script tracking
	private pathposi: GridPoint[] = [];
	private path: number[] = [];
	private sequence: Action[] = [];
	private checkText: string;
	private correctText: string;
	private words: Word[] = [];

	constructor(check: string, correct: string) {
		this.checkText = check;
		this.correctText = correct;

		this.a = check.length > correct.length ? correct : check;
		this.b = check.length > correct.length ? check : correct;
		this.m = this.a.length;
		this.n = this.b.length;

		this.stringsReversed = this.a !== check;
	}

	calc() {
		let p = -1;
		const delta = this.n - this.m;
		// The array [-M ... N]
		const size = this.m + this.n + 3
		const fp: number[] = new Array(size).fill(-1);
		this.path = new Array(size).fill(-1);
		const offset = this.m + 1;

		do {
			p++;

			for (let k = -p; k <= delta - 1; k++) {
				fp[k + offset] = this.snake(k, offset, fp[k - 1 + offset] + 1, fp[k + 1 + offset]);
			}

			for (let k = delta + p; k >= delta + 1; k--) {
				fp[k + offset] = this.snake(k, offset, fp[k - 1 + offset] + 1, fp[k + 1 + offset]);
			}

			fp[delta + offset] = this.snake(delta, offset, fp[delta - 1 + offset] + 1, fp[delta + 1 + offset]);
		} while(fp[delta + offset] !== this.n);

		this.dist = delta + 2 * p;

		let r = this.path[delta + offset];
		const seqPath: GridPoint[] = []; // The path to be followed

		while (r !== -1) {
			seqPath.push({ ...this.pathposi[r], k: null });
			r = this.pathposi[r].k as number;
		}

		this.parseSequence(seqPath);
	}

	private snake(k: number, offset: number, p: number, pp: number): number {
		let y = Math.max(p, pp);
		let x = y - k;

		while (x < this.m && y < this.n && this.a[x] === this.b[y]) {
			x++;
			y++;
		}

		this.path[k + offset] = this.pathposi.length;
		this.pathposi.push({
			x,
			y,
			k: this.path[k + offset + (p > pp ? -1 : 1)]
		});

		return y;
	}

	private parseSequence(seqPath: GridPoint[]) {
		let x_a = 0;
		let y_b = 0;

		for (let i = seqPath.length - 1; i >= 0; i--) {
			while (x_a < seqPath[i].x || y_b < seqPath[i].y) {
				if (seqPath[i].y - seqPath[i].x > y_b - x_a) {
					// Down

					const char = this.b[y_b];
					const subtype = char === " " || char === "\n" ? "SPACE" : (charIsPunctuation(char) ? "PUNCT" : "ORTHO");

					this.sequence.push({
						id: uuidv4(),
						type: this.stringsReversed ? "DEL" : "ADD",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						char,
						subtype,
					});

					y_b++;
				} else if (seqPath[i].y - seqPath[i].x < y_b - x_a) {
					// Right

					const char = this.a[x_a];
					const subtype = char === " " || char === "\n" ? "SPACE" : (charIsPunctuation(char) ? "PUNCT" : "ORTHO");

					this.sequence.push({
						id: uuidv4(),
						type: this.stringsReversed ? "ADD" : "DEL",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						char,
						subtype
					});

					x_a++;
				} else {
					// Diagonal

					// this.sequence.push({
					// 	type: "NONE",
					// 	indexCheck: this.stringsReversed ? y_b : x_a,
					// 	indexCorrect: this.stringsReversed ? x_a : y_b,
					// 	char: this.a[x_a],
					// });

					x_a++;
					y_b++;
				}
			}
		}

		// Post-processing
		this.calcDiffIndex();
		this.consolidatePunctuationWhitespaces();
		this.parseSubstitutions();
		this.cleanEMDashes();

		// Word recognition
		this.words = this.parseWords();
		this.setCharToWordReference();

		this.dist = this.sequence.length;
	}

	// Parse indexCheck to give an index for the diffed text
	// Writes to original array
	private calcDiffIndex() {
		// IMO this solution is pretty garbage, but I can't really be bothered to come up with a better one rn
		// TODO: Improve this piece of shit

		let checkTextCopy = this.checkText;

		// Add the characters in the checkText, and mark each character with an ID
		for (let i = this.sequence.length - 1; i >= 0; i--) {
			const a = this.sequence[i];

			const contentBefore = checkTextCopy.substring(0, a.indexCheck);
			const contentAfter = checkTextCopy.substring(a.indexCheck + (a.type === "DEL" ? 1 : 0)); // if DEL, replace the existing character

			checkTextCopy = `${contentBefore}<loc id="${i}">${a.char}</loc>${contentAfter}`;
		}

		let locMatch: RegExpMatchArray;

		// Iterate over all marked characters and set .indexDiff to their index of their corresponding action
		do {
			locMatch = checkTextCopy.match(/(?<tag1><loc id="(?<id>\d+?)">)(?<char>.+?|\n)(?<tag2><\/loc>)/m);

			if (!locMatch) break;

			const action = this.sequence[Number(locMatch.groups.id)];
			action.indexDiff = locMatch.index;

			checkTextCopy = `${checkTextCopy.substring(0, locMatch.index)}${locMatch.groups.char}${checkTextCopy.substring(locMatch.index + locMatch[0].length)}`;
		} while(locMatch);
	}

	private consolidatePunctuationWhitespaces() {
		for (const a of this.sequence) {
			if (!charIsPunctuation(a.char)) continue;

			const originalIndexDiff = a.indexDiff;

			// Merge any space errors around this character

			const spaceAfter = this.sequence.findIndex((other) => {
				return a.type === other.type
					&& other.char === " "
					&& other.indexDiff === originalIndexDiff + 1;
			});

			if (spaceAfter !== -1) {
				a.char = `${a.char} `;
				this.sequence.splice(spaceAfter, 1);
			}

			const spaceBefore = this.sequence.findIndex((other) => {
				return a.type === other.type
					&& other.char === " "
					&& other.indexDiff === originalIndexDiff - 1;
			});

			if (spaceBefore !== -1 && a.type !== "SUB") {
				a.char = ` ${a.char}`;
				// Decrement the indices to accomodate the space
				a.indexDiff--;
				// If there are other characters that need to be added at the same spot,
				// decreasing indexCheck would break the order
				// So the check here should fix that (Especially relevant at the end of the essays)
				if (!this.sequence.find((other) => other.indexCheck === a.indexCheck && other.indexDiff !== a.indexDiff)) a.indexCheck--;

				this.sequence.splice(spaceBefore, 1);
			} else if (
				a.char.match(/—/)
				// && a.type === "DEL"
				&& this.checkText[a.indexCheck - 1] === " "
				&& a.indexCheck !== this.checkText.length - 1
				// The indexDiff condition prevents .find() returning the same action as a
				&& !this.sequence.find((other) => other.indexCheck === a.indexCheck && other.indexDiff !== a.indexDiff)
			) {
				a.char = ` ${a.char}`;
				// Decrement the indices to accomodate the space
				a.indexDiff--;
				a.indexCheck--;
			}
		}
	}

	// Returns a copy
	private parseSubstitutions() {
		// Find DEL and ADD actions that are next to eachother
		const seqCopy: Action[] = [];

		const addActions = this.sequence.filter((a) => a.type === "ADD");
		const delActions = this.sequence.filter((a) => a.type === "DEL");

		// They should already be sorted, but just in case
		addActions.sort((a, b) => a.indexDiff - b.indexDiff);
		delActions.sort((a, b) => a.indexDiff - b.indexDiff);

		for (const a of addActions) {
			const nextDel = delActions.findIndex((delA) => {
				return (delA.indexDiff === a.indexDiff + 1 || delA.indexDiff === a.indexDiff - 1)
					&& delA.char !== " "
					&& delA.subtype === a.subtype;
			});
			const delA = delActions[nextDel];

			// Don't substitute spaces and substitute only letters for letters and punctuation for punctuation
			if (nextDel !== -1) {
				let newChar = a.char;

				// Special case, as the EM dash consumes both spaces around it
				if (a.subtype === "PUNCT" && delA.char.match(/—/g)) {
					newChar = `${a.char} `;
				}

				seqCopy.push({
					id: uuidv4(),
					type: "SUB",
					subtype: a.subtype,
					indexCheck: delA.indexCheck,
					indexCorrect: a.indexCorrect,
					indexDiff: a.indexDiff,
					char: newChar,
					charBefore: delA.char,
				});

				delActions.splice(nextDel, 1);

				// Decrement indexDiff from later actions, as a SUB removes one character
				this.shiftIndexDiff([...addActions, ...delActions], a.indexDiff, -1);
			} else {
				seqCopy.push(a);
			}
		}

		seqCopy.push(...delActions);
		this.sequence = seqCopy;
	}

	private cleanEMDashes() {
		// Remove the 2nd whitespace for EM dashes from the DEL action
		for (const a of this.sequence.filter((action) => action.char.match(/— $/g) && action.type === "DEL")) {
			a.char = a.char.substring(0, a.char.length - 1);
		}
	}

	private parseWords() {
		// Make sure that the ADD operations are in order
		this.sequence.sort((a, b) => a.indexDiff - b.indexDiff);

		const errWords: Word[] = [];
		const seqCopy = [...this.sequence.filter((action) => action.subtype === "ORTHO")];

		// Iterate over all letter errors
		for (let i = 0; i < seqCopy.length; i++) {
			const a = seqCopy[i];
			
			// Check if it is a completely new word being added
			if (a.type === "ADD") {
				// If the ADD starts on a word delimiter, it is probably a word
				let isNewWord = charIsWordDelimeter(this.checkText[a.indexCheck]);
				let newWordAddActions: Action[] = []; // Used only if it isNewWord=true
				let newWord: string = a.char; // Used only if it isNewWord=true

				let curOffset = 1;
				let indexInMainSequence = this.sequence.findIndex((other) => other.indexDiff === a.indexDiff);

				// Iterate over sequential ADD actions until space or punctuation found
				while (
					this.sequence[indexInMainSequence + curOffset]
					&& this.sequence[indexInMainSequence + curOffset].type === "ADD"
					&& this.sequence[indexInMainSequence + curOffset].indexDiff - a.indexDiff === curOffset
				) {
					const otherA = this.sequence[indexInMainSequence + curOffset];

					if (otherA.subtype !== "ORTHO") {
						isNewWord = true;
						break;
					} else {
						newWordAddActions.push(otherA);
						newWord += otherA.char;
						curOffset++;
					}
				}

				// If it is just a stray letter ADD, i.e. only one sequential ADD action, then don't consider it a new word
				if (isNewWord && newWord.length !== 1) {
					const word: Word = {
						type: "ADD",
						boundsCorrect: [a.indexCorrect, a.indexCorrect + newWord.length],
						word: newWord,
						actions: [a, ...newWordAddActions],
					};
	
					errWords.push(word);
	
					// Remove the remaining ADD actions from seqCopy
					seqCopy.splice(i + 1, newWordAddActions.length);
					// seqLengthOffset += newWordAddActions.length;
	
					continue;
				}
			}

			const bounds: [number, number] = getWordBounds(this.checkText, a.indexCheck);

			if (bounds[0] - 1 === bounds[1]) continue; // In case it is some odd single character thing

			const word: Word = {
				type: "ERR",
				boundsCheck: bounds,
				word: this.checkText.substring(bounds[0], bounds[1]),
				actions: [],
			};

			const actionsInWord = seqCopy.filter((action) => {
				return (action.indexCheck >= bounds[0] && action.indexCheck < bounds[1])
					// && action.indexCorrect !== a.indexCorrect;
			});
			
			word.actions.push(...actionsInWord);
			let allActionsAreDelete = true;

			for (const action of actionsInWord) {
				const ind = seqCopy.findIndex((other) => other.indexDiff === action.indexDiff);
				if (action.type !== "DEL") allActionsAreDelete = false;

				if (ind === i) continue;

				seqCopy.splice(ind, 1);
			}

			if (allActionsAreDelete && word.actions.length === word.word.length) {
				word.type = "DEL";
			} else {
				const correctBounds = getWordBounds(this.correctText, a.indexCorrect);
				word.boundsCorrect = correctBounds;
				word.wordCorrect = this.correctText.substring(correctBounds[0], correctBounds[1]);
			}

			errWords.push(word);
		}

		return errWords;
	}

	private setCharToWordReference() {
		for (let i = 0; i < this.words.length; i++) {
			for (let a of this.words[i].actions) {
				a.wordIndex = i;
			}
		}
	}

	private shiftIndexDiff(arrRef: Action[], shiftStartIndex: number, shiftAmount: number) {
		for (const otherA of arrRef.filter((otherA) => otherA.indexDiff > shiftStartIndex)) {
			otherA.indexDiff += shiftAmount;
		}
	}

	checkRegister() {
		const checkPromises: Promise<void>[] = [];

		for (const a of this.sequence) {
			checkPromises.push(new Promise(async (res, rej) => {
				a.inRegister = await actionRegister.isActionInRegister(a, true);
				res();
			}));
		}

		return Promise.all(checkPromises);
	}

	getDistance() {
		return this.dist;
	}

	getSequence() {
		return this.sequence;
	}

	getWords() {
		return this.words;
	}
}
