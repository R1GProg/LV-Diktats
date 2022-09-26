import { Bounds } from '@shared/diff-engine';
import { model, Schema, Types } from 'mongoose';

// A variation of Mistake that stores only IDs of Actions, as Actions will be stored in their own document.
export interface MistakeStore {
	id: string,
	hash: string,
	type: string,
	subtype: string,
	actions: Types.ObjectId[],
	boundsCheck: Bounds,
	boundsCorrect: Bounds,
	boundsDiff: Bounds,
	word: string,
	wordCorrect?: string,
	registerId: string | null,
	children: Types.ObjectId[],
	workspace: string,
	mergedId: string | null
}

const mistakeSchema = new Schema<MistakeStore>({
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

export const MistakeDoc = model<MistakeStore>('Mistake', mistakeSchema);