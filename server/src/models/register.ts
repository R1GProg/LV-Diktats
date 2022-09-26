import { model, Schema } from 'mongoose';

export interface RegisterStore {
	id: string,
	mistakes: string[],
	description: string,
	ignore: boolean,
	count: number,
	workspace: string
}

const registerSchema = new Schema<RegisterStore>({
	id: String,
	mistakes: [String],
	description: String,
	ignore: Boolean,
	count: Number,
	workspace: String
});

export const RegisterDoc = model<RegisterStore>('Register', registerSchema);