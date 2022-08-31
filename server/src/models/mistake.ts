import { ActionType, ActionSubtype } from '@shared/diff-engine/Action';
import { Bounds } from '@shared/diff-engine/langUtil';
import { MistakeType } from '@shared/diff-engine/Mistake';
import mongoose from "mongoose";

interface IAction {
	// hash: string;
	id: string;
	type: ActionType;
	subtype: ActionSubtype;
	indexCheck: number;
	indexCorrect: number;
	indexDiff: number;
	char: string;
	charBefore: string | null;
	hash: string;
}

interface IMistake {
	// hash: string;
	actions: IAction[];
	type: MistakeType;
	registerId: string | null;
	boundsCorrect: Bounds;
	boundsCheck: Bounds;
	boundsDiff: Bounds;
}

interface MistakeDoc extends mongoose.Document {
	actions: IAction[];
	type: MistakeType;
	registerId: string | null;
	boundsCorrect: Bounds;
	boundsCheck: Bounds;
	boundsDiff: Bounds;
}

interface mistakeModelInterface extends mongoose.Model<MistakeDoc> {
	build(attr: IMistake): MistakeDoc;
}

const mistakeSchema = new mongoose.Schema({
	actions: [{
		id: {
			type: String,
			required: true
		},
		type: {
			type: Number
		},
		subtype: {
			type: Number
		},
		indexCheck: {
			type: Number
		},
		indexCorrect: {
			type: Number
		},
		indexDiff: {
			type: Number
		},
		char: {
			type: String
		},
		charBefore: {
			type: String,
			nullable: true
		},
		hash: {
			type: String
		}
	}],
	type: {
		type: Number
	},
	registerId: {
		type: String,
		nullable: true
	},
	boundsCorrect: {
		start: {
			type: Number
		},
		end: {
			type: Number
		}
	},
	boundsCheck: {
		start: {
			type: Number
		},
		end: {
			type: Number
		}
	},
	boundsDiff: {
		start: {
			type: Number
		},
		end: {
			type: Number
		}
	}
});

mistakeSchema.statics.build = (attr: IMistake) => {
	return new Mistake(attr);
}

const Mistake = mongoose.model<MistakeDoc, mistakeModelInterface>("Mistake", mistakeSchema);

export { Mistake }