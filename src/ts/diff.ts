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

interface P {
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
	private pathposi: P[] = [];
	private path: number[] = [];
	private sequence: Action[] = [];

	constructor(_a: string, _b: string) {
		this.a = _a.length > _b.length ? _b : _a;
		this.b = _a.length > _b.length ? _a : _b;
		this.m = this.a.length;
		this.n = this.b.length;

		this.stringsReversed = this.a !== _a;
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
		const epc: P[] = [];

		while (r !== -1) {
			epc.push({ ...this.pathposi[r], k: null });
			r = this.pathposi[r].k as number;
		}

		this.parseSequence(epc);
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

	private parseSequence(epc: P[]) {
		let px_idx = 0;
		let py_idx = 0;

		for (let i = epc.length - 1; i >= 0; i--) {
			while (px_idx < epc[i].x || py_idx < epc[i].y) {
				if (epc[i].y - epc[i].x > py_idx - px_idx) {
					// Down

					this.sequence.push({
						type: this.stringsReversed ? "DEL" : "ADD",
						indexCheck: this.stringsReversed ? py_idx : px_idx,
						indexCorrect: this.stringsReversed ? px_idx : py_idx,
						char: this.b[py_idx],
					});

					py_idx++;
				} else if (epc[i].y - epc[i].x < py_idx - px_idx) {
					// Right

					this.sequence.push({
						type: this.stringsReversed ? "ADD" : "DEL",
						indexCheck: this.stringsReversed ? py_idx : px_idx,
						indexCorrect: this.stringsReversed ? px_idx : py_idx,
						char: this.a[px_idx],
					});

					px_idx++;
				} else {
					// Diagonal
					px_idx++;
					py_idx++;
				}
			}
		}

		// TODO: Make substitution parsing

		// Parse substitutions

		// const sequenceCopy: Action[] = [];

		// for (let i = 1; i < this.sequence.length; i++) {
		// 	// indexCorrect is equal for two subsequent entries if it's a substitution
		// 	if (this.sequence[i].indexCorrect !== this.sequence[i - 1].indexCorrect) {
		// 		sequenceCopy.push(this.sequence[i - 1]);

		// 		if (i === this.sequence.length - 1) {
		// 			sequenceCopy.push(this.sequence[i]);
		// 		}

		// 		continue;
		// 	}

		// 	sequenceCopy.push({
		// 		type: "SUB",
		// 		indexCheck: this.sequence[i - 1].indexCheck,
		// 		indexCorrect: this.sequence[i].indexCorrect,
		// 		char: this.sequence[i - 1].char,
		// 	});

		// 	i++; // Skip over the next one
		// }

		// this.sequence = sequenceCopy;
		// this.dist = this.sequence.length;
	}

	getDistance() {
		return this.dist;
	}

	getSequence() {
		return this.sequence;
	}
}

