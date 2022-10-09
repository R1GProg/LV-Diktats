import { Parse } from "@shared/processing";
import LocalWorkspaceDatabase from "../database/LocalWorkspaceDatabase";

export default class LocalWorkspaceController {
	db: LocalWorkspaceDatabase;

	constructor() {
		this.db = new LocalWorkspaceDatabase();
	}

	async init() {
		return this.db.databaseInit();
	}

	async importCSV(name: string, template: string, csv: string) {
		let i = 0;

		console.log("Parsing dataset...");

		const data = await Parse.parseCSV(name, csv, template, (id: number) => {
			if ((++i) % 100 === 0) {
				console.log(`${i} submissions parsed!`);
			}
		});

		console.log("Dataset parsed!");
		
		console.log("Writing dataset...");
		await this.db.importWorkspace(data);
		console.log("Dataset written!");
	}
}