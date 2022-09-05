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
