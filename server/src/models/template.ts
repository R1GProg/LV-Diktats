import mongoose from "mongoose";

interface ITemplate {
	message: string;
}

interface TemplateDoc extends mongoose.Document {
	message: string;
}

interface templateModelInterface extends mongoose.Model<TemplateDoc> {
	build(attr: ITemplate): TemplateDoc;
}

const submissionSchema = new mongoose.Schema({
	message: {
		type: String,
		required: true
	}
});

submissionSchema.statics.build = (attr: ITemplate) => {
	return new Template(attr);
}

const Template = mongoose.model<TemplateDoc, templateModelInterface>("Template", submissionSchema);

export { Template }