import type { MistakeId } from "@shared/diff-engine";

export type OnMistakeSelectionChange = (data: MistakeId[]) => void;

export default class MistakeSelection {
	private selectedMistakes: Set<MistakeId> = new Set();

	private cbs: OnMistakeSelectionChange[] = [];

	constructor(updateCb: () => void = () => {}) {
		this.onChange(updateCb);
	}

	add(...ids: MistakeId[]) {
		for (const id of ids) {
			this.selectedMistakes.add(id);
		}

		this.execUpdateCbs();
	}

	remove(...ids: MistakeId[]) {
		for (const id of ids) {
			if (!this.selectedMistakes.has(id)) continue;
			this.selectedMistakes.delete(id);
		}

		this.execUpdateCbs();
	}

	clear() {
		this.selectedMistakes.clear();

		this.execUpdateCbs();
	}

	has(id: MistakeId) {
		return this.selectedMistakes.has(id);
	}

	toggle(id: MistakeId) {
		if (this.has(id)) {
			this.remove(id);
		} else {
			this.add(id);
		}
	}

	size() {
		return this.selectedMistakes.size;
	}

	get() {
		return Array.from(this.selectedMistakes);
	}

	onChange(cb: OnMistakeSelectionChange) {
		this.cbs.push(cb);
	}

	private execUpdateCbs() {
		const data = this.get();

		for (const cb of this.cbs) {
			cb(data);
		}
	}
}