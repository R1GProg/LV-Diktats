// The action done to go from target to source character
export type ActionType = "ADD" | "DEL" | "SUB" | "NONE";

export interface Action {
	type: ActionType,
	indexCheck: number,
	indexCorrect: number,
	indexDiff?: number,
	char: string, // The character to delete, to add, or to substitute with, depending on the action type
	charBefore?: string, // Defined only for type=SUB
}

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

	constructor(check: string, correct: string) {
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

					this.sequence.push({
						type: this.stringsReversed ? "DEL" : "ADD",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						char: this.b[y_b],
					});

					y_b++;
				} else if (seqPath[i].y - seqPath[i].x < y_b - x_a) {
					// Right

					this.sequence.push({
						type: this.stringsReversed ? "ADD" : "DEL",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						char: this.a[x_a],
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

		// Parse indexCheck to give an index for the diffed text
		// IMO this solution is pretty garbage, but I can't really be bothered to come up with a better one rn
		// TODO: Improve this piece of shit
		let checkText = this.stringsReversed ? this.b : this.a;

		// Add the characters in the checkText, and mark each character with an ID
		for (let i = this.sequence.length - 1; i >= 0; i--) {
			const a = this.sequence[i];

			const contentBefore = checkText.substring(0, a.indexCheck);
			const contentAfter = checkText.substring(a.indexCheck + (a.type === "DEL" ? 1 : 0)); // if DEL, replace the existing character

			checkText = `${contentBefore}<loc id="${i}">${a.char}</loc>${contentAfter}`;
		}

		let locMatch: RegExpMatchArray;

		// Iterate over all marked characters and set .indexDiff to their index of their corresponding action
		do {
			locMatch = checkText.match(/(?<tag1><loc id="(?<id>\d+?)">)(?<char>.+?|\n)(?<tag2><\/loc>)/m);

			if (!locMatch) break;

			const action = this.sequence[Number(locMatch.groups.id)];
			action.indexDiff = locMatch.index;

			checkText = `${checkText.substring(0, locMatch.index)}${locMatch.groups.char}${checkText.substring(locMatch.index + locMatch[0].length)}`;
		} while(locMatch);

		// Parse substitutions
		// Find DEL and ADD actions that are next to eachother
		const seqCopy: Action[] = [];

		const addActions = this.sequence.filter((a) => a.type === "ADD");
		const delActions = this.sequence.filter((a) => a.type === "DEL");

		// They should already be sorted, but just in case
		addActions.sort((a, b) => a.indexDiff - b.indexDiff);
		delActions.sort((a, b) => a.indexDiff - b.indexDiff);

		for (const a of addActions) {
			const nextDel = delActions.findIndex((delA) => delA.indexDiff === a.indexDiff + 1 || delA.indexDiff === a.indexDiff - 1);

			if (nextDel !== -1) {
				const delA = delActions[nextDel];

				seqCopy.push({
					type: "SUB",
					indexCheck: delA.indexCheck,
					indexCorrect: a.indexCorrect,
					indexDiff: a.indexDiff,
					char: a.char,
					charBefore: delA.char
				});

				delActions.splice(nextDel, 1);

				// Decrement indexDiff from later actions, as a SUB removes one character
				for (const otherA of [...addActions, ...delActions].filter((otherA) => otherA.indexDiff > a.indexDiff)) {
					otherA.indexDiff--;
				}
			} else {
				seqCopy.push(a);

			}
		}

		seqCopy.push(...delActions);
		this.sequence = seqCopy;
		this.dist = seqCopy.length;
	}

	getDistance() {
		return this.dist;
	}

	getSequence() {
		return this.sequence;
	}
}

