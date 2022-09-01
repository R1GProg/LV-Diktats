import mongoose from "mongoose";

interface IRegister {
	// hash: string;
	id: string;
	description: string;
	ignore: boolean;
	// category: string; // TODO: Perhaps turn this into an enum?
}

interface RegisterDoc extends mongoose.Document {
	id: string;
	description: string;
	ignore: boolean;
}

interface registerModelInterface extends mongoose.Model<RegisterDoc> {
	build(attr: IRegister): RegisterDoc;
}

const registerSchema = new mongoose.Schema({
	id: {
		type: String,
		required: true
	},
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