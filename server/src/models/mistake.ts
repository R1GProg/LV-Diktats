// import { ActionType, ActionSubtype } from '@shared/diff-engine/Action';
// import { Bounds } from '@shared/diff-engine/langUtil';
// import { MistakeType } from '@shared/diff-engine/Mistake';
import type { ActionType, ActionSubtype } from "@shared/diff-engine/src/Action";
import type { Bounds } from "@shared/diff-engine/src/langUtil";
import type { MistakeType } from '@shared/diff-engine/src/Mistake';
import mongoose from "mongoose";

export interface IAction {
	// hash: string;
	id: string;
	type: ActionType;
	subtype: ActionSubtype;
	indexCheck: number;
	indexCorrect: number;
	indexDiff: number;
	char: string;
	charBefore: string | undefined;
	hash: string;
}

export interface IMistake {
	// hash: string;
	actions: IAction[];
	type: MistakeType;
	registerId: mongoose.Schema.Types.ObjectId | undefined;
	boundsCorrect: Bounds | undefined;
	boundsCheck: Bounds | undefined;
	boundsDiff: Bounds | undefined;
	hash: string;
	workspace: string;
	ocurrences: number;
}

interface MistakeDoc extends mongoose.Document {
	actions: IAction[];
	type: MistakeType;
	registerId: mongoose.Schema.Types.ObjectId | undefined;
	boundsCorrect: Bounds | undefined;
	boundsCheck: Bounds | undefined;
	boundsDiff: Bounds | undefined;
	hash: string;
	workspace: string;
	ocurrences: number;
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
			type: String
		},
		subtype: {
			type: String
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
		type: String
	},
	registerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Register",
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
	},
	hash: {
		type: String
	},
	workspace: String,
	ocurrences: Number
});

mistakeSchema.statics.build = (attr: IMistake) => {
	return new Mistake(attr);
}

const Mistake = mongoose.model<MistakeDoc, mistakeModelInterface>("Mistake", mistakeSchema);

export { Mistake }