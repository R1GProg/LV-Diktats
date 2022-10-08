import { model, Schema, Types } from 'mongoose';
import { WorkspaceStore } from '@shared/api-types/database';

const workspaceSchema = new Schema<WorkspaceStore<Types.ObjectId>>({
	id: String,
	name: String,
	template: String,
	submissions: [Schema.Types.ObjectId],
	register: [Schema.Types.ObjectId],
	mergedMistakes: [[String]]
});

export const WorkspaceDoc = model<WorkspaceStore<Types.ObjectId>>('Workspace', workspaceSchema);