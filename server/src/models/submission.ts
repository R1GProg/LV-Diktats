import { model, Schema, Types } from 'mongoose';
import { SubmissionStore } from '@shared/api-types/database';

const submissionSchema = new Schema<SubmissionStore<Types.ObjectId>>({
	id: String,
	state: String,
	data: {
		text: String,
		ignoreText: [{
			start: Number,
			end: Number
		}],
		mistakes: [Schema.Types.ObjectId],
		metadata: {
			age: Number,
			language: String,
			language_other: String,
			level: String,
			degree: String,
			country: String,
			city: String
		}
	},
	workspace: String
});

export const SubmissionDoc = model<SubmissionStore<Types.ObjectId>>('Submission', submissionSchema);