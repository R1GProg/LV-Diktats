import DiktifySocket from "$lib/ts/networking/DiktifySocket";
import DiktifyAPI from "$lib/ts/networking/DiktifyAPI";
import LocalWorkspaceController from "$lib/ts/controller/LocalWorkspaceController";
import config from "$lib/config.json";
import type { Stores } from "$lib/ts/stores";
import type { Submission, SubmissionID, UUID, Workspace, WorkspacePreview } from "@shared/api-types";
import WorkspaceCacheDatabase from "$lib/ts/database/WorkspaceCacheDatabase";
import { APP_ONLINE } from "../networking/networking";

export default class WorkspaceController {
	private socket: DiktifySocket;

	private localController: LocalWorkspaceController;

	private cache: WorkspaceCacheDatabase;

	private api: DiktifyAPI;

	// ID: isLocal
	private workspaceLocations: Record<UUID, boolean> = {};

	constructor(
		workspace: Stores["workspace"],
		activeSubmissionID: Stores["activeSubmissionID"]
	) {
		this.socket = new DiktifySocket(config.socketUrl, workspace, activeSubmissionID);
		this.localController = new LocalWorkspaceController();
		this.cache = new WorkspaceCacheDatabase();
		this.api = new DiktifyAPI();
	}

	async init(): Promise<void> {
		await Promise.all([
			this.socket.init(),
			this.localController.init(),
			this.cache.databaseInit()
		]);
	}

	async getWorkspaces(): Promise<WorkspacePreview[]> {
		const workspaces: WorkspacePreview[] = [];

		if (await APP_ONLINE) workspaces.push(...(await this.api.getWorkspaces()));
		workspaces.push(...(await this.localController.getWorkspaces()));

		return workspaces;
	}

	async getWorkspace(wsData: WorkspacePreview): Promise<Workspace | null> {
		if (wsData.local) {
			return this.localController.getWorkspace(wsData.id);
		} else {
			return this.api.getWorkspace(wsData.id);
		}
	}

	async getSubmission(ws: WorkspacePreview, submId: SubmissionID): Promise<Submission | null> {
		throw "NYI";
	}
}