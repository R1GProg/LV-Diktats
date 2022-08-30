import mongoose from "mongoose";

enum SubmissionStates {
	UNGRADED = "UNGRADED",
	REJECTED = "REJECTED",
	WIP = "WIP",
	DONE = "DONE"
}
export { SubmissionStates };

interface ISubmission {
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
		default: SubmissionStates
	}
});

submissionSchema.statics.build = (attr: ISubmission) => {
	return new Submission(attr);
}

const Submission = mongoose.model<SubmissionDoc, submissionModelInterface>("Submissions", submissionSchema);

export { Submission }