import mongoose from "mongoose";

interface IMistake {
	hash: string;
	description: string;
	category: string; // TODO: Perhaps turn this into an enum?
}

interface MistakeDoc extends mongoose.Document {
	hash: string;
	description: string;
	category: string;
}

interface mistakeModelInterface extends mongoose.Model<MistakeDoc> {
	build(attr: IMistake): MistakeDoc;
}

const mistakeSchema = new mongoose.Schema({
	hash: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	category: {
		type: String
	}
});

mistakeSchema.statics.build = (attr: IMistake) => {
	return new Mistake(attr);
}

const Mistake = mongoose.model<MistakeDoc, mistakeModelInterface>("Mistake", mistakeSchema);

export { Mistake }