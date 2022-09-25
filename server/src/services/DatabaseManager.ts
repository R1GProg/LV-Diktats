import { WorkspaceDataset } from './DatasetManager';
import { Types } from "mongoose";
import { ActionDoc } from "../models/action";
import { MistakeDoc, MistakeStore } from "../models/mistake";
import { RegisterDoc } from "../models/register";
import { SubmissionDoc, SubmissionStore } from "../models/submission";
import { WorkspaceDoc, WorkspaceStore } from "../models/workspace";
import DiffONP, { ActionData, ActionSubtype, ActionType, Bounds, Mistake, MistakeData, MistakeSubtype, MistakeType } from '@shared/diff-engine';
import { RegisterEntry, Submission, SubmissionPreview, SubmissionState, Workspace, WorkspacePreview } from '@shared/api-types';

// Manages database interactions, providing an abstraction layer between DB types and shared data types.

// Deletion Functions
// - Removes Mistake from all Submissions, useful in cases of merging
async function removeMistakeFromSubmission(mistakeID: Types.ObjectId) {
	const submissions = await SubmissionDoc.find({ "data.mistakes": { $elemMatch: mistakeID } });
	for (const submission of submissions) {
		submission.data.mistakes.splice(submission.data.mistakes.findIndex(id => id.toString() === mistakeID.toString()));
		await submission.save();
	}
}
// - Removes Mistake from all Register, useful in cases of unmerging
async function removeMistakeHashFromRegister(hash: string) {
	const registers = await RegisterDoc.find({ mistakes: { $elemMatch: hash } });
	for (const register of registers) {
		register.mistakes.splice(register.mistakes.findIndex(x => x === hash));
		if (register.mistakes.length === 0) {
			await register.delete();
			continue;
		}
		await register.save();
	}
}
// - Deletes Mistake using ObjectId
async function deleteMistake(mistakeID: Types.ObjectId) {
	await removeMistakeFromSubmission(mistakeID);
	const mistake = await MistakeDoc.findById(mistakeID);
	if (!mistake) return;
	await removeMistakeHashFromRegister(mistake.hash);
	await mistake.delete();
}
// - Delete by WorkspaceID
export async function deleteWorkspace(workspaceID: string) {
	await ActionDoc.deleteMany({ workspace: workspaceID });
	await MistakeDoc.deleteMany({ workspace: workspaceID });
	await SubmissionDoc.deleteMany({ workspace: workspaceID });
	await RegisterDoc.deleteMany({ workspace: workspaceID });
	await WorkspaceDoc.deleteOne({ id: workspaceID });
}
// - Delete a specific Register entry
export async function deleteRegister(registerID: string, workspaceID: string) {
	const register = await RegisterDoc.findOne({ workspace: workspaceID, id: registerID });
	const workspace = await WorkspaceDoc.findOne({ id: workspaceID });
	if (!workspace || !register) return false;

	// Remove the register reference from workspace.
	const index = workspace.register.findIndex(x => x.toString() === register._id.toString());
	if (index !== -1) {
		workspace.register.splice(index);
		await workspace.save();
	}

	// Delete the register from DB
	await register.delete();

	return true;
}

// Insertion Functions
// - Insert Action
async function insertAction(action: ActionData, workspace: string): Promise<Types.ObjectId> {
	const entry = new ActionDoc({ ...action, workspace });
	await entry.save();
	return entry._id;
}
// - Insert Mistake
async function insertMistake(mistake: MistakeData, workspace: string): Promise<Types.ObjectId> {
	// Sanity check to not write multiple of the same mistake
	const existingMistake = await MistakeDoc.findOne({ id: mistake.id });
	if (existingMistake) return existingMistake._id;

	const actionPromises: Promise<Types.ObjectId>[] = [];
	for (const action of mistake.actions) {
		actionPromises.push(insertAction(action, workspace));
	}
	const actionIDs = await Promise.all(actionPromises);

	const childrenPromises: Promise<Types.ObjectId>[] = [];
	for (const child of mistake.children) {
		actionPromises.push(insertMistake(child, workspace));
	}
	const childrenIDs = await Promise.all(childrenPromises);

	let mistakeStore = { ...mistake, actions: actionIDs, children: childrenIDs, workspace }
	const entry = new MistakeDoc(mistakeStore);
	await entry.save();
	return entry._id;
}
// - Insert Submission
async function insertSubmission(submission: Submission, workspace: string): Promise<Types.ObjectId> {
	const mistakePromises: Promise<Types.ObjectId>[] = [];
	for (const mistake of submission.data.mistakes) {
		mistakePromises.push(insertMistake(mistake, workspace));
	}
	const mistakeIDs = await Promise.all(mistakePromises);
	const submissionStore: SubmissionStore = {
		...submission,
		data: {
			...submission.data,
			mistakes: mistakeIDs
		},
		workspace
	}
	const entry = new SubmissionDoc(submissionStore);
	await entry.save();
	return entry._id;
}
// - Insert RegisterEntry
async function insertRegister(register: RegisterEntry, workspace: string): Promise<Types.ObjectId> {
	const mistakes = await MistakeDoc.find({ workspace, hash: { $in: register.mistakes } }); // Count all the mistakes whose hashes match with register to get count.
	const entry = new RegisterDoc({ ...register, workspace, count: mistakes.length });
	await entry.save();
	return entry._id;
}
// - Insert WorkspaceDataset
export async function insertWorkspaceDataset(workspace: WorkspaceDataset) {
	// Iterate through submissions to write them to the Submission document.
	const submissionPromises: Promise<Types.ObjectId>[] = [];
	for (const submissionID in workspace.submissions) {
		submissionPromises.push(insertSubmission(workspace.submissions[submissionID], workspace.id));
	}
	const submissionIDs = await Promise.all(submissionPromises);

	// Iterate through registers to write them to the Register document.
	const registerPromises: Promise<Types.ObjectId>[] = [];
	for (const register of workspace.register) {
		registerPromises.push(insertRegister(register, workspace.id));
	}
	const registerIDs = await Promise.all(registerPromises);

	// Generate a workspace store from the dataset.
	const workspaceStore: WorkspaceStore = {
		...workspace,
		submissions: submissionIDs,
		register: registerIDs
	}

	// Save the workspace to DB.
	const entry = new WorkspaceDoc(workspaceStore);
	await entry.save();
}
// - Wrapper for insertRegister to validate that a register doesn't already exist and to ensure it is added to the Workspace it belongs to.
export async function insertRegisterEntry(id: string, workspaceID: string, registerEntry: RegisterEntry) {
	let register = await RegisterDoc.findOne({ id: id, workspace: workspaceID });
	if (register) return null;

	const workspace = await WorkspaceDoc.findOne({ id: workspaceID });
	if (!workspace) return null;

	const registerID = await insertRegister(registerEntry, workspaceID);
	workspace.register.push(registerID);
	await workspace.save();

	register = await RegisterDoc.findById(registerID);
	if (!register) throw new Error("Register doesn't exist despite having been created!");

	return {
		id: register.id,
		mistakes: register.mistakes,
		description: register.description,
		ignore: register.ignore,
		count: register.count
	} as RegisterEntry;
}

// Fetching Functions
// - Get WorkspacePreviews of available workspaces
export async function listWorkspaces(): Promise<WorkspacePreview[]> {
	const workspaces = await WorkspaceDoc.find();
	const workspacePreviews: WorkspacePreview[] = [];
	for (const workspace of workspaces) {
		workspacePreviews.push({
			id: workspace.id,
			name: workspace.name
		});
	}
	return workspacePreviews;
}
// - Get Workspace based on ID
export async function getWorkspace(id: string): Promise<Workspace | null> {
	const workspace = await WorkspaceDoc.findOne({ id });
	if (!workspace) return null; // If workspace does not exist, return null.

	const result: Workspace = {
		id: workspace.id,
		name: workspace.name,
		template: workspace.template,
		submissions: await fetchSubmissionsInWorkspace(workspace.id),
		register: await fetchRegistersInWorkspace(workspace.id)
	}

	return result;
}
// - Get a Record of Submission Previews within a Workspace
export async function fetchSubmissionsInWorkspace(workspaceID: string): Promise<Record<string, SubmissionPreview>> {
	const submissions = await SubmissionDoc.find({ workspace: workspaceID });
	const submissionPreviews: Record<string, SubmissionPreview> = {};

	for (const submission of submissions) {
		submissionPreviews[submission.id] = {
			id: submission.id,
			state: submission.state as SubmissionState // Although the DB treats it as a string, it is always equivalent to the enum, save for random acts of god.
		};
	}

	return submissionPreviews;
}
// - Get a list of Register Entries within a Workspace
export async function fetchRegistersInWorkspace(workspaceID: string): Promise<RegisterEntry[]> {
	const registers = await RegisterDoc.find({ workspace: workspaceID });
	const registerEntries: RegisterEntry[] = [];

	for (const register of registers) {
		registerEntries.push({
			id: register.id,
			mistakes: register.mistakes,
			description: register.description,
			ignore: register.ignore,
			count: register.count
		});
	}

	return registerEntries;
}
// - Get an Action by ObjectID
async function fetchActionByObjectID(actionID: Types.ObjectId): Promise<ActionData> {
	const actionStore = await ActionDoc.findById(actionID);
	if (!actionStore) throw new Error(`Invalid Action ID ${actionID}!`);
	// NOTE: We can't use ...actionStore to prefill fields that don't need any processing because that will also include mongoose fields!!
	const actionData: ActionData = {
		id: actionStore.id,
		type: actionStore.type as ActionType,
		subtype: actionStore.subtype as ActionSubtype,
		indexCheck: actionStore.indexCheck,
		indexCorrect: actionStore.indexCorrect,
		indexDiff: actionStore.indexDiff,
		char: actionStore.char
	};
	return actionData;
}
// - Get a Mistake by ObjectID
async function fetchMistakeByObjectID(mistakeID: Types.ObjectId): Promise<MistakeData> {
	const mistakeStore = await MistakeDoc.findById(mistakeID);
	if (!mistakeStore) throw new Error(`Invalid Mistake ID ${mistakeID}!`);
	const actionPromises = [];
	for (const actionID of mistakeStore.actions) {
		actionPromises.push(fetchActionByObjectID(actionID));
	}
	const actionList = await Promise.all(actionPromises);
	const childrenPromises = [];
	for (const childID of mistakeStore.children) {
		childrenPromises.push(fetchMistakeByObjectID(childID));
	}
	const childList = await Promise.all(childrenPromises);
	const mistakeData: MistakeData = {
		id: mistakeStore.id,
		hash: mistakeStore.hash,
		type: mistakeStore.type as MistakeType,
		subtype: mistakeStore.type as MistakeSubtype,
		actions: actionList,
		boundsCheck: mistakeStore.boundsCheck,
		boundsCorrect: mistakeStore.boundsCorrect,
		boundsDiff: mistakeStore.boundsDiff,
		word: mistakeStore.word,
		wordCorrect: mistakeStore.wordCorrect,
		registerId: mistakeStore.registerId,
		children: childList,
		mergedId: mistakeStore.mergedId
	};
	return mistakeData;
}
// - Get a Mistake ObjectID by Hash
async function fetchMistakeObjectIDByHash(mistakeID: string, workspaceID: string): Promise<Types.ObjectId | null> {
	const mistake = await MistakeDoc.findOne({ workspace: workspaceID, id: mistakeID });
	if (!mistake) return null;
	else return mistake._id;
}
// - Get a Submission with a certain ID that's within a Workspace
export async function fetchSubmissionByID(submissionID: string, workspaceID: string): Promise<Submission | null> {
	const submissionStore = await SubmissionDoc.findOne({ id: submissionID, workspace: workspaceID });
	if (!submissionStore) return null;
	const mistakePromises = [];
	for (const mistakeID of submissionStore.data.mistakes) {
		mistakePromises.push(fetchMistakeByObjectID(mistakeID));
	}
	const mistakeList = await Promise.all(mistakePromises);
	const submissionData: Submission = {
		id: submissionStore.id,
		state: submissionStore.state as SubmissionState,
		data: {
			...submissionStore.data,
			mistakes: mistakeList
		}
	};
	return submissionData;
}

// Update Functions
// - Update RegisterEntry by ID
export async function updateRegisterByID(registerID: string, workspaceID: string, newRegister: RegisterEntry) {
	const register = await RegisterDoc.findOne({ id: registerID, workspace: workspaceID });
	if (!register) return null;

	// Update all fields to match the new object
	register.id = newRegister.id; // Unsure if this is necessary, but seems like it's better to have it be here than risk breakage if an ID change is ever necessary.
	register.mistakes = newRegister.mistakes;
	register.description = newRegister.description;
	register.ignore = newRegister.ignore;

	const mistakes = await MistakeDoc.find({ workspaceID, hash: { $in: register.mistakes } });
	register.count = mistakes.length;

	await register.save();

	return {
		id: register.id,
		mistakes: register.mistakes,
		description: register.description,
		ignore: register.ignore,
		count: register.count
	} as RegisterEntry; // Return new register data on success
}
// - Update SubmissionState by ID
export async function updateSubmissionStateByID(submissionID: string, workspaceID: string, newState: SubmissionState) {
	const submission = await SubmissionDoc.findOne({ id: submissionID, workspace: workspaceID });
	if (!submission) return false;

	submission.state = newState;
	await submission.save();

	return true;
}
// - Update ignoreText in Submission by ID
export async function updateSubmissionIgnoreTextByID(submissionID: string, workspaceID: string, bounds: Bounds[]) {
	const submission = await SubmissionDoc.findOne({ id: submissionID, workspace: workspaceID });
	if (!submission) return false;

	submission.data.ignoreText = bounds;
	await submission.save();

	await regenerateMistakesInSubmission(submissionID, workspaceID);

	return true;
}
// - Merge Mistakes by hash
export async function mergeMistakesByHash(mistakeHashes: string[], workspaceID: string) {
	const mistakes = await MistakeDoc.find({ hash: { $in: mistakeHashes }, workspace: workspaceID });
	if (mistakes.length === 0) return false;

	const affectedSubmissions = await SubmissionDoc.find({ "data.mistakes": { $elemMatch: { $in: mistakes.map(x => x._id) } } });
	const submissionMistakeMap: Record<string, Types.ObjectId[]> = {}; // Key is Submission ID, value is mistakes

	for (const submission of affectedSubmissions) {
		submissionMistakeMap[submission.id] = [];
		for (const mistake of submission.data.mistakes) {
			const isFound = mistakes.find(x => x._id.toString() === mistake.toString());
			if (isFound) submissionMistakeMap[submission.id].push(isFound.id);
		}
	}

	const removalPromises = [];
	for (const submissionID in submissionMistakeMap) {
		const mistakeIDs = submissionMistakeMap[submissionID];
		const mistakePromises = mistakeIDs.map(ID => fetchMistakeByObjectID(ID));
		const mistakeDatas = await Promise.all(mistakePromises);
		const mergedMistake = Mistake.mergeMistakes(...mistakeDatas.map(mistake => Mistake.fromData(mistake)));
		for (const mistakeID of mistakeIDs) {
			removalPromises.push(await removeMistakeFromSubmission(mistakeID));
		}
		const mergedMistakeID = await insertMistake(await mergedMistake.exportData(), workspaceID);
		const submission = affectedSubmissions.find(x => x.id === submissionID);
		if (!submission) throw new Error(`Submission ${submissionID} suddenly does not exist anymore!`);
		submission.data.mistakes.push(mergedMistakeID);
		await submission.save();
	}
	await Promise.all(removalPromises);


	return affectedSubmissions.map(x => x.id);
}
// - Unmerge Mistakes by hash
export async function unmergeMistakesByHash(mistakeHash: string, workspaceID: string) {
	const mistakes = await MistakeDoc.find({ hash: mistakeHash, workspace: workspaceID });
	if (mistakes.length === 0) return false;

	const affectedSubmissions = await SubmissionDoc.find({ "data.mistakes": { $elemMatch: { $in: mistakes.map(x => x._id) } } });
	const submissionMistakeMap: Record<string, Types.ObjectId> = {}; // Key is Submission ID, value is mistake

	for (const submission of affectedSubmissions) {
		for (const mistake of submission.data.mistakes) {
			const isFound = mistakes.find(x => x._id.toString() === mistake.toString());
			if (isFound) submissionMistakeMap[submission.id] = isFound.id;
		}
	}

	const removalPromises = [];
	for (const submissionID in submissionMistakeMap) {
		const mistakeID = submissionMistakeMap[submissionID];
		const mistakeData = await fetchMistakeByObjectID(mistakeID);
		const mistake = Mistake.fromData(mistakeData);
		const unmergedMistakes = Mistake.unmergeMistake(mistake);

		removalPromises.push(await deleteMistake(mistakeID));

		const unmergedMistakesPromises = unmergedMistakes.map(async x => await x.exportData());
		const unmergedMistakesData = await Promise.all(unmergedMistakesPromises);
		const unmergedMistakesIdsPromises = unmergedMistakesData.map(async x => await fetchMistakeObjectIDByHash(x.id, workspaceID));
		const unmergedMistakesIds = await Promise.all(unmergedMistakesIdsPromises);

		const submission = affectedSubmissions.find(x => x.id === submissionID);
		if (!submission) throw new Error(`Submission ${submissionID} suddenly does not exist anymore!`);
		for (const id of unmergedMistakesIds) {
			if (id) submission.data.mistakes.push(id);
		}
		await submission.save();
	}
	await Promise.all(removalPromises);


	return affectedSubmissions.map(x => x.id);
}
// - Regenerate Mistakes of Submission, currently this also deletes all merged mistakes within it
async function regenerateMistakesInSubmission(submissionID: string, workspaceID: string) {
	const submission = await SubmissionDoc.findOne({ id: submissionID, workspace: workspaceID });
	const workspace = await WorkspaceDoc.findOne({ id: workspaceID });
	if (!submission || !workspace) return false;

	const deletionPromises = [];
	for (const mistakeID of submission.data.mistakes) {
		deletionPromises.push(deleteMistake(mistakeID));
	}
	await Promise.all(deletionPromises);

	let text = submission.data.text;
	let offset = 0;
	for (const bound of submission.data.ignoreText) {
		text = text.substring(0, bound.start - offset) + text.substring(bound.end - offset);
		offset += bound.start - bound.end;
	}
	const diff = new DiffONP(text, workspace.template);
	diff.calc();

	const mistakes = diff.getMistakes();
	const mistakeData: MistakeData[] = await Promise.all(mistakes.map((m: Mistake) => m.exportData()));

	const mistakeIDPromises = [];
	for (const mistake of mistakeData) {
		mistakeIDPromises.push(insertMistake(mistake, workspaceID));
	}
	const mistakeIDs = await Promise.all(mistakeIDPromises);
	submission.data.mistakes = mistakeIDs;

	await submission.save();
	return;
}