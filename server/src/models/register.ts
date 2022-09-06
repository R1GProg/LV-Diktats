import mongoose from "mongoose";

interface IRegister {
	// hash: string;
	description: string;
	ignore: boolean;
	// category: string; // TODO: Perhaps turn this into an enum?
}

interface RegisterDoc extends mongoose.Document {
	description: string;
	ignore: boolean;
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
	}
});

registerSchema.statics.build = (attr: IRegister) => {
	return new Register(attr);
}

const Register = mongoose.model<RegisterDoc, registerModelInterface>("Register", registerSchema);

export { Register }