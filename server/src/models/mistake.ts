import { MistakeStore } from '@shared/api-types/database';
import { model, Schema, Types } from 'mongoose';

const mistakeSchema = new Schema<MistakeStore<Types.ObjectId>>({
	id: String,
	hash: String,
	type: String,
	subtype: String,
	actions: [Schema.Types.ObjectId],
	boundsCheck: {
		start: Number,
		end: Number
	},
	boundsCorrect: {
		start: Number,
		end: Number
	},
	boundsDiff: {
		start: Number,
		end: Number
	},
	word: String,
	wordCorrect: {
		type: String,
		nullable: true
	},
	registerId: {
		type: String,
		nullable: true
	},
	children: [Schema.Types.ObjectId],
	workspace: String,
	mergedId: {
		type: String,
		nullable: true
	}
});

export const MistakeDoc = model<MistakeStore<Types.ObjectId>>('Mistake', mistakeSchema);