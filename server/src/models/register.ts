import mongoose from "mongoose";

export interface IRegister {
	// hash: string;
	hash: string; // the hash rn
	description: string;
	ignore: boolean;
	workspace: string;
	word: string;
	wordCorrect: string;
	// category: string; // TODO: Perhaps turn this into an enum?
}

interface RegisterDoc extends mongoose.Document {
	hash: string;
	description: string;
	ignore: boolean;
	workspace: string;
	word: string;
	wordCorrect: string;
}

interface registerModelInterface extends mongoose.Model<RegisterDoc> {
	build(attr: IRegister): RegisterDoc;
}

const registerSchema = new mongoose.Schema({
	hash: String,
	description: {
		type: String
	},
	ignore: {
		type: Boolean
	},
	workspace: String,
	word: String,
	wordCorrect: String
});

registerSchema.statics.build = (attr: IRegister) => {
	return new Register(attr);
}

const Register = mongoose.model<RegisterDoc, registerModelInterface>("Register", registerSchema);

export { Register }