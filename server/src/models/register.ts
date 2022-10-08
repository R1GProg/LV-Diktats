import { RegisterStore } from '@shared/api-types/database';
import { model, Schema, Types } from 'mongoose';

const registerSchema = new Schema<RegisterStore<Types.ObjectId>>({
	id: String,
	mistakes: [String],
	description: String,
	ignore: Boolean,
	count: Number,
	workspace: String
});

export const RegisterDoc = model<RegisterStore<Types.ObjectId>>('Register', registerSchema);