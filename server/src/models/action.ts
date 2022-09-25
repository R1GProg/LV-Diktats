import { Action } from '@shared/diff-engine';
import { model, Schema } from 'mongoose';

export interface ActionStore {
	id: string,
	type: string,
	subtype: string,
	indexCheck: number,
	indexCorrect: number,
	indexDiff: number,
	char: string,
	workspace: string
}

const actionSchema = new Schema<ActionStore>({
	id: String,
	type: String,
	subtype: String,
	indexCheck: Number,
	indexCorrect: Number,
	indexDiff: Number,
	char: {
		type: String,
		nullable: true
	},
	workspace: String
});

export const ActionDoc = model<ActionStore>('Action', actionSchema);