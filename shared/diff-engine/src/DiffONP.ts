
// The action done to go from target to source character
interface GridPoint {
	x: number,
	y: number,
	k: number | null,
}

export interface DiffAction<T> {
	item: T,
	type: "DEL" | "ADD",
	indexCheck: number,
	indexCorrect: number,
}

export type DiffPredicate<T> = (a: T, b: T) => boolean;

// Based on
// https://github.com/cubicdaiya/onp/
// https://www.sciencedirect.com/science/article/abs/pii/002001909090035V
export default class DiffONP<Item> {
	private a: Item[];
	private b: Item[];
	private m: number;
	private n: number;
	private dist: number | null = null;
	private stringsReversed: boolean;

	// Edit script tracking
	private pathposi: GridPoint[] = [];
	private path: number[] = [];
	private sequence: DiffAction<Item>[] = [];
	private predicate: DiffPredicate<Item>;

	constructor(check: Item[], correct: Item[], predicate: DiffPredicate<Item> = (a, b) => a === b) {
		this.a = check.length > correct.length ? correct : check;
		this.b = check.length > correct.length ? check : correct;
		this.m = this.a.length;
		this.n = this.b.length;

		this.stringsReversed = this.a !== check;
		this.predicate = predicate;
	}

	setData(check: Item[], correct: Item[]) {
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

		while (x < this.m && y < this.n && this.predicate(this.a[x], this.b[y])) {
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

					const item = this.b[y_b];

					this.sequence.push({
						type: this.stringsReversed ? "DEL" : "ADD",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						item
					});

					y_b++;
				} else if (seqPath[i].y - seqPath[i].x < y_b - x_a) {
					// Right

					const item = this.a[x_a];

					this.sequence.push({
						type: this.stringsReversed ? "ADD" : "DEL",
						indexCheck: this.stringsReversed ? y_b : x_a,
						indexCorrect: this.stringsReversed ? x_a : y_b,
						item
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

		this.dist = this.sequence.length;
	}

	getDistance() {
		return this.dist;
	}

	getSequence() {
		return this.sequence;
	}
}
