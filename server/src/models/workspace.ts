import { SubmissionDoc } from './submission';
import { Workspace } from '@shared/api-types';
import { model, Schema, Types } from 'mongoose';

// A variation of Workspace that stores only IDs, as Submissions will be stored in their own document.
export interface WorkspaceStore {
	id: string;
	name: string;
	template: string;
	submissions: Types.ObjectId[];
	register: Types.ObjectId[];
	mergedMistakes: string[][]; // Hashes of mistakes that have been merged.
}

const workspaceSchema = new Schema<WorkspaceStore>({
	id: String,
	name: String,
	template: String,
	submissions: [Schema.Types.ObjectId],
	register: [Schema.Types.ObjectId],
	mergedMistakes: [[String]]
});

export const WorkspaceDoc = model<WorkspaceStore>('Workspace', workspaceSchema);