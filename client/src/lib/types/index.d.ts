export interface EssayEntry {
	id: string,
	text: string | null,
}

export interface Workspace {
	name: string,
	key: string,
	dataset: Record<string, EssayEntry>,
	template: string,
	local: boolean,
}
