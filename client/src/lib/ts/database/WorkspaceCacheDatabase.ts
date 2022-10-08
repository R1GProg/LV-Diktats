import type { Submission, SubmissionID, UUID } from "@shared/api-types";
import config from "$lib/config.json";
import type DiktifySocket from "$lib/ts/networking/DiktifySocket";
import BrowserDatabase from "$lib/ts/database/BrowserDatabase";

type CacheEntry = Record<SubmissionID, Submission>;

export default class WorkspaceCacheDatabase extends BrowserDatabase {
	private ds: DiktifySocket;

	constructor(ds: DiktifySocket) {
		super({
			name: "WorkspaceCache",
			initEmpty: config.cacheSingleSession,
			stores: [{ name: "submissionCache" }]
		});

		this.ds = ds;
	}

	async readSubmissionCache(workspace: UUID) {
		return this.read<CacheEntry>("submissionCache", workspace);
	}

	async isSubmissionCached(id: SubmissionID, workspace: UUID): Promise<boolean | null> {
		if (!(await this.storeHasKey("submissionCache", workspace))) {
			return false;
		}

		const wsCache = await this.readSubmissionCache(workspace);
		return Object.keys(wsCache).includes(id);
	}

	async addSubmissionToCache(submission: Submission, workspace: UUID) {
		const workspaceExists = await this.storeHasKey("submissionCache", workspace);
		const data = workspaceExists ? await this.readSubmissionCache(workspace) : {};

		data[submission.id] = submission;

		await this.update<CacheEntry>("submissionCache", workspace, data);
	}

	async removeSubmissionsFromCache(ids: SubmissionID[], workspace: UUID) {
		const workspaceExists = await this.storeHasKey("submissionCache", workspace);

		if (!workspaceExists) {
			this.warn("Attempt to remove submission from a workspace cache that doesn't exist!", { workspace });
			return;
		}

		const data = workspaceExists ? await this.readSubmissionCache(workspace) : {};

		for (const id of ids) {
			if (!(id in data)) continue;

			delete data[id];
		}

		await this.update<CacheEntry>("submissionCache", workspace, data);
	}

	async updateSubmissionInCache(submission: Submission, workspace: UUID) {
		const workspaceExists = await this.storeHasKey("submissionCache", workspace);

		if (!workspaceExists) {
			this.warn("Attempt to update cache for a workspace that doesnt exist!", { workspace });
			return null;
		}

		const data = await this.readSubmissionCache(workspace);
		data[submission.id] = submission;

		await this.update<CacheEntry>("submissionCache", workspace, data);
	}

	async getSubmission(id: SubmissionID, workspace: UUID): Promise<Submission | null> {
		if (await this.isSubmissionCached(id, workspace)) {
			return (await this.read<CacheEntry>("submissionCache", workspace))[id];
		} else {
			const subm = await this.ds.requestSubmission(id, workspace);
			await this.addSubmissionToCache(subm, workspace);
			return subm;
		}
	}

	async clearWorkspaceCache(workspace: UUID) {
		this.delete("submissionCache", workspace);
	}

	async clearEntireCache() {
		this.clearStore("submissionCache");
	}
}
