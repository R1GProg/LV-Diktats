import { model, Schema, Types } from 'mongoose';
import { ActionStore } from "@shared/api-types/database";

const actionSchema = new Schema<ActionStore<Types.ObjectId>>({
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

export const ActionDoc = model<ActionStore<Types.ObjectId>>('Action', actionSchema);