export interface Cell {
	distance: number,
	actions: Action[],
}

// The action done to go from target to source character
export type ActionType = "ADD" | "DEL" | "SUB" | "NONE";

export interface Action {
	type: ActionType,
	indexCheck: number,
	indexCorrect: number,
	char: string, // The character to delete, to add, or to substitute with, depending on the action type
	charBefore?: string, // Defined only for type=SUB
}

export function getDiff_BasicLevenshtein(correct: string, check: string) {
	let n = correct.length;
	let m = check.length;
	let mat: Cell[][] = [];

	for (let i = 0; i < m; i++) {
		mat.push(new Array(n).fill(0));
	}

	for (let i = 0; i < n; i++) {
		mat[0][i] = { distance: i, actions: [] };
	}

	for (let i = 0; i < m; i++) {
		mat[i][0] = { distance: i, actions: [] };
	}

	for (let i = 1; i < m; i++) {
		let checkChar = check.charAt(i);

		for (let j = 1; j < n; j++) {
			let cost = correct.charAt(j) === checkChar ? 0 : 1;

			const delDist = mat[i - 1][j].distance + 1; // deletion
			const insDist = mat[i][j - 1].distance + 1; // insertion
			const subDist = mat[i - 1][j - 1].distance + cost; // substitution
			const minDist = Math.min(delDist, insDist, subDist);

			// Set a value just so TS doesnt scream at me about undefined before assigned,
			// even though the variable will get assigned in any case in the switch statement
			let aType: ActionType = "NONE";
			let prevActions: Action[] = [];
			let deltaChar: string = "";

			switch (minDist) {
				case delDist:
					aType = "DEL";
					prevActions = mat[i - 1][j].actions;
					deltaChar = check.charAt(i);
					break;
				case insDist:
					aType = "ADD";
					prevActions = mat[i][j - 1].actions;
					deltaChar = correct.charAt(j);
					break;
				case subDist:
					prevActions = mat[i - 1][j - 1].actions;

					if (cost === 0) {
						aType = "NONE";
					} else {
						aType = "SUB";
						deltaChar = correct.charAt(j);
					}

					break;
			}

			const action: Action = {
				type: aType,
				indexCheck: i,
				indexCorrect: j,
				char: deltaChar,
			}

			mat[i][j] = {
				distance: minDist,
				actions: aType === "NONE" ? prevActions : [ ...prevActions, action ]
			}
		}
	}

	return mat[m - 1][n - 1];
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

		// Parse substitutions
		// Find ADD actions whose indexCorrect matches with a DEL action's indexCheck

		// const sequenceCopy: Action[] = [];
		// const addActions = this.sequence.filter((a) => a.type === "ADD");
		// const delActions = this.sequence.filter((a) => a.type === "DEL");

		// for (const action of addActions) {
		// 	const iCorrect = action.indexCorrect;
		// 	const delPair = delActions.findIndex((a) => a.indexCheck === iCorrect)

		// 	if (delPair !== -1) {
		// 		// ADD/DEL Sub pair found

		// 		const delAction = delActions[delPair];

		// 		sequenceCopy.push({
		// 			type: "SUB",
		// 			indexCheck: delAction.indexCheck,
		// 			indexCorrect: iCorrect,
		// 			char: action.char,
		// 			charBefore: delAction.char,
		// 		});

		// 		delActions.splice(delPair, 1); // Remove the delete action to prevent adding it twice
		// 	} else {
		// 		sequenceCopy.push(action);
		// 	}
		// }

		// this.sequence = [...sequenceCopy, ...delActions];
		// this.dist = this.sequence.length;
	}

	getDistance() {
		return this.dist;
	}

	getSequence() {
		return this.sequence;
	}
}

