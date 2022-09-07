import { Bounds, charIsPunctuation, charIsWordDelimeter, getWordBounds } from "./langUtil";
import { Action } from "./Action";
import { Mistake, MistakeOpts, MistakeType } from "./Mistake";
import { getMaxElement, getMinElement } from "./util";

// The action done to go from target to source character

interface GridPoint {
	x: number,
	y: number,
	k: number | null,
}

export interface DiffChar {
	type: "ACTION" | "EXISTING",
	char: string,
	action?: Action, // Defined only for type=ACTION
	matchedToWord: boolean // A quick and dirty way to prevent duplicate word matches
}

// Based on
// https://github.com/cubicdaiya/onp/
// https://www.sciencedirect.com/science/article/abs/pii/002001909090035V
export default class DiffONP {
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
	private mistakes: Mistake[] = [];
	private diff: DiffChar[] = []; // Characters of the diff in sequential order

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

					this.sequence.push(new Action({
						type: this.stringsReversed ? "DEL" : "ADD",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						char,
						subtype
					}));

					y_b++;
				} else if (seqPath[i].y - seqPath[i].x < y_b - x_a) {
					// Right

					const char = this.a[x_a];
					const subtype = char === " " || char === "\n" ? "SPACE" : (charIsPunctuation(char) ? "PUNCT" : "ORTHO");

					this.sequence.push(new Action({
						type: this.stringsReversed ? "ADD" : "DEL",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						char,
						subtype
					}));

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

		this.calcDiffIndex();
		
		// Mistake-level PP

		this.mistakes = this.parseWords();

		// Remove duplicate actions from this.sequence
		for (const mistake of this.mistakes) {
			for (const action of mistake.actions) {
				this.sequence.splice(this.sequence.findIndex((a) => a.id === action.id), 1);
			}
		}
		
		// Add mistake containers to the rest of the actions
		for (const action of this.sequence) {
			if (action.mistake) continue;

			const mistakeOpts: MistakeOpts = {
				actions: [ action ],
				type: action.type === "SUB" || action.type === "NONE" ? "MIXED" : action.type,
				boundsDiff: { start: action.indexDiff, end: action.indexDiff + action.char.length },
				subtype: "OTHER",
				// correctText: this.correctText,
				// checkText: this.checkText
			};

			if (action.type === "ADD" || action.type === "SUB")
				mistakeOpts.boundsCorrect = { start: action.indexCorrect, end: action.indexCorrect + action.char.length };

			if (action.type === "DEL" || action.type === "SUB")
				mistakeOpts.boundsCheck = { start: action.indexCheck, end: action.indexCheck + action.char.length };

			this.mistakes.push(new Mistake(mistakeOpts));
		}

		this.mistakes.sort((a, b) => a.boundsDiff.start - b.boundsDiff.start);
		this.dist = this.sequence.length;
	}

	// Parse indexCheck to give an index for the diffed text
	// Writes to original array
	private calcDiffIndex() {
		// IMO this solution is pretty garbage, but I can't really be bothered to come up with a better one rn
		// TODO: Improve this piece of shit

		let checkTextCopy = this.checkText;
		const seqCopy = [...this.sequence];
		seqCopy.sort((a, b) => a.indexCheck - b.indexCheck);

		// Add the characters in the checkText, and mark each character with an ID
		for (let i = seqCopy.length - 1; i >= 0; i--) {
			const a = seqCopy[i];

			const contentBefore = checkTextCopy.substring(0, a.indexCheck);

			const charOffset = a.type !== "ADD" ? a.char.length : 0;
			const contentAfter = checkTextCopy.substring(a.indexCheck + charOffset);

			checkTextCopy = `${contentBefore}<loc id="${i}">${a.char}</loc>${contentAfter}`;
		}

		// Parse the generated text into a diff text
		const locTagRegex = /(?<tag1><loc id="(?<id>\d+?)">)(?<char>.+?|\n)(?<tag2><\/loc>)/m;

		// console.log(checkTextCopy);

		this.diff = [];

		for (let i = 0; i < checkTextCopy.length; i++) {
			if (checkTextCopy.substring(i, i + 8) === "<loc id=") {
				const locMatch = checkTextCopy.substring(i).match(locTagRegex);

				if (locMatch) {
					const action = seqCopy[Number(locMatch.groups!.id)];
					action.indexDiff = i;

					this.diff.push({ type: "ACTION", char: action.char, action, matchedToWord: false });
					checkTextCopy = checkTextCopy.replace(locMatch[0], action.char);

					continue;
				}
			}

			this.diff.push({ type: "EXISTING", char: checkTextCopy[i], matchedToWord: false });
		}
	}

	private consolidatePunctuationWhitespaces() {
		for (const a of this.sequence) {
			if (!charIsPunctuation(a.char) || a.char === "\"") continue;

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

				seqCopy.push(new Action({
					type: "SUB",
					subtype: a.subtype,
					indexCheck: delA.indexCheck,
					indexCorrect: a.indexCorrect,
					indexDiff: a.indexDiff,
					char: delA.char,
					charCorrect: newChar,
				}));

				delActions.splice(nextDel, 1);

				// Decrement indexDiff from later actions, as a SUB removes one character
				// this.shiftIndexDiff([...addActions, ...delActions], a.indexDiff, -1);
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

	// start - inclusive, end - exclusive
	private getDiffWordBounds(startIndex: number): Bounds {
		const bounds: Bounds = { start: 0, end: this.diff.length - 1 };

		// Find the start
		for (let i = startIndex; i >= 0; i--) {
			const c = this.diff[i];

			if (charIsWordDelimeter(c.char) && c.action?.type !== "DEL") {
				bounds.start = i + 1;
				break;
			}
		}

		// Find the end
		for (let i = startIndex; i < this.diff.length; i++) {
			const c = this.diff[i];

			if (charIsWordDelimeter(this.diff[i].char) && c.action?.type !== "DEL") {
				bounds.end = i;
				break;
			}
		}

		return bounds;
	}

	private parseWords(): Mistake[] {
		const mistakes: Mistake[] = [];

		for (let i = 0; i < this.diff.length; i++) {
			const charData = this.diff[i];

			if (charData.matchedToWord) continue;
			if (charData.type === "EXISTING" || charData.action === undefined) continue;

			const rootAction = charData.action;

			if (rootAction.subtype !== "ORTHO") continue;

			// If it is a letter action, get the bounds of the word it is part of
			const boundsDiff = this.getDiffWordBounds(i);

			// Get all the actions in the diffBounds
			const charsInWord = this.diff.slice(boundsDiff.start, boundsDiff.end);
			const actionsInWord = charsInWord.filter((c) => c.type === "ACTION").map((c) => c.action!);

			for (const char of charsInWord) {
				char.matchedToWord = true;
			}

			let mistakeType: MistakeType = "MIXED";
			const allActionsAreDEL = actionsInWord.every((a) => a.type === "DEL") && charsInWord.length === actionsInWord.length;
			const allActionsAreADD = actionsInWord.every((a) => a.type === "ADD") && charsInWord.length === actionsInWord.length;

			// Make sure the entire word is new
			if (allActionsAreDEL) mistakeType = "DEL";
			if (allActionsAreADD) mistakeType = "ADD";

			const wordChars = mistakeType === "MIXED" ? charsInWord.filter((c) => c.action?.type !== "ADD") : charsInWord;
			const word = wordChars.map((c) => c.char).join("");
			
			let boundsCheck: Bounds | null = null;
			let boundsCorrect: Bounds | null = null;

			if (!allActionsAreDEL) { // DEL words dont have boundsCorrect
				// const checkActions = actionsInWord.filter((a) => a.type !== "DEL")
				const checkActions = actionsInWord;

				const startOffset = charsInWord.findIndex((v) => v.type === "ACTION");

				boundsCorrect = {
					start: getMinElement<Action>(checkActions, (a) => a.indexCorrect).indexCorrect - startOffset,
					end: getMaxElement<Action>(checkActions, (a) => a.indexCorrect).indexCorrect,
				}
			}

			if (!allActionsAreADD) { // ADD words dont have boundsCheck
				// const checkActions = actionsInWord.filter((a) => a.type !== "ADD");
				const checkActions = actionsInWord;

				const startOffset = charsInWord.findIndex((v) => v.type === "ACTION");

				boundsCheck = {
					start: getMinElement<Action>(checkActions, (a) => a.indexCheck)!.indexCheck - startOffset,
					end: getMaxElement<Action>(checkActions, (a) => a.indexCheck)!.indexCheck,
				}
			}

			const mistake = new Mistake({
				type: mistakeType,
				boundsCheck,
				boundsCorrect,
				boundsDiff,
				actions: [...actionsInWord],
				subtype: "WORD",
				word
			});

			mistakes.push(mistake);
		}

		return mistakes;
	}

	getDistance() {
		return this.dist;
	}

	getSequence() {
		return this.sequence;
	}

	getMistakes() {
		return this.mistakes;
	}
}

export * from "./Mistake";
export * from "./Action";
