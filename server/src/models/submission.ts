import { Bounds } from "@shared/diff-engine/src";
import mongoose from "mongoose";
import { IMistake, Mistake } from "./mistake";

enum SubmissionStates {
	UNGRADED = "UNGRADED",
	REJECTED = "REJECTED",
	WIP = "WIP",
	DONE = "DONE"
}
export { SubmissionStates };

export interface ISubmission {
	id: number;
	message: string;
	age: number;
	language: string;
	language_other: string;
	level: string;
	degree: string;
	country: string;
	city: string;
	state: SubmissionStates;
	mistakes: mongoose.Schema.Types.ObjectId[];
	ignoreText: Bounds[];
	workspace: string;
}

interface SubmissionDoc extends mongoose.Document {
	id: number;
	message: string;
	age: number;
	language: string;
	language_other: string;
	level: string;
	degree: string;
	country: string;
	city: string;
	state: SubmissionStates;
	mistakes: mongoose.Schema.Types.ObjectId[];
	ignoreText: Bounds[];
	workspace: string;
}

interface submissionModelInterface extends mongoose.Model<SubmissionDoc> {
	build(attr: ISubmission): SubmissionDoc;
}

const submissionSchema = new mongoose.Schema({
	id: {
		type: Number,
		required: true
	},
	message: {
		type: String,
		required: true
	},
	age: {
		type: Number
	},
	language: {
		type: String
	},
	language_other: {
		type: String
	},
	level: {
		type: String
	},
	degree: {
		type: String
	},
	country: {
		type: String
	},
	city: {
		type: String
	},
	state: {
		type: String,
		enum: SubmissionStates,
		default: SubmissionStates.UNGRADED
	},
	mistakes: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Mistake"
	}],
	ignoredText: [{
		start: {
			type: Number
		},
		end: {
			type: Number
		}
	}],
	workspace: String
});

submissionSchema.statics.build = (attr: ISubmission) => {
	return new Submission(attr);
}

const Submission = mongoose.model<SubmissionDoc, submissionModelInterface>("Submissions", submissionSchema);

export { Submission }