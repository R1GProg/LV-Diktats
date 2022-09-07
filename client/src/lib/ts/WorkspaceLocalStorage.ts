import type { Workspace } from "$lib/types";

export function saveLocalWorkspace(data: Workspace) {
	const existingData: Workspace[] = JSON.parse(localStorage.getItem("local-workspaces") ?? "[]");
	existingData.push(data);
	localStorage.setItem("local-workspaces", JSON.stringify(existingData));
}

export function loadLocalWorkspaces() {
	const existingData: Workspace[] = JSON.parse(localStorage.getItem("local-workspaces") ?? "[]");
	return existingData;
}

export function updateLocalWorkspace(newData: Workspace) {
	const existingData: Workspace[] = JSON.parse(localStorage.getItem("local-workspaces") ?? "[]");
	const existingWorkspace = existingData.findIndex((w) => w.key === newData.key);

	if (existingWorkspace === -1) {
		console.warn(`Attempt to update a non-existant local workspace ${newData.key}`);
		return;
	}

	existingData[existingWorkspace] = newData;
	localStorage.setItem("local-workspaces", JSON.stringify(existingData));
}
