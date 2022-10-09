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

	async importCSV(name: string, template: string, csv: string, log = false) {
		let i = 0;
		const logFunc = (msg: string) => { if (log) console.log(msg); }

		logFunc("Parsing dataset...");

		const data = await Parse.parseCSV(name, csv, template, (id: number) => {
			if ((++i) % 50 === 0) {
				logFunc(`${i} submissions parsed!`);
			}
		});

		logFunc("Dataset parsed!");
		
		logFunc("Writing dataset...");
		await this.db.importWorkspace(data);
		logFunc("Dataset written!");
	}
}