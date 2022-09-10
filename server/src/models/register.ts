import mongoose from "mongoose";

export interface IRegister {
	// hash: string;
	description: string;
	ignore: boolean;
	workspace: string;
	// category: string; // TODO: Perhaps turn this into an enum?
}

interface RegisterDoc extends mongoose.Document {
	description: string;
	ignore: boolean;
	workspace: string;
}

interface registerModelInterface extends mongoose.Model<RegisterDoc> {
	build(attr: IRegister): RegisterDoc;
}

const registerSchema = new mongoose.Schema({
	description: {
		type: String
	},
	ignore: {
		type: Boolean
	},
	workspace: String
});

registerSchema.statics.build = (attr: IRegister) => {
	return new Register(attr);
}

const Register = mongoose.model<RegisterDoc, registerModelInterface>("Register", registerSchema);

export { Register }