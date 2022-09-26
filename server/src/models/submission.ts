import { MistakeData } from '@shared/diff-engine';
import { Bounds } from '@shared/diff-engine';
import { Submission } from '@shared/api-types';
import { model, Schema, Types } from 'mongoose';

// A variation of Submission that stores only IDs of Mistakes, as Mistakes will be stored in their own document.
export interface SubmissionStore {
	id: string,
	state: string,
	data: {
		text: string,
		ignoreText: Bounds[],
		mistakes: Types.ObjectId[],
		metadata: {
			age: number,
			language: string,
			language_other: string,
			level: string,
			degree: string,
			country: string,
			city: string
		}
	},
	workspace: string
}

const submissionSchema = new Schema<SubmissionStore>({
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

export const SubmissionDoc = model<SubmissionStore>('Submission', submissionSchema);