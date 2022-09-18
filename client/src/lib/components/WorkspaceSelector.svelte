<script lang="ts">
	import { APP_ONLINE } from "$lib/ts/networking";
	import { onMount } from "svelte";
	import WorkspaceUploader from "./modals/WorkspaceUploader.svelte";
	import { workspace, workspaceDatabase } from "$lib/ts/stores";
	import type { EssayEntry, WorkspaceMistake, RegisterEntry } from "$lib/types";
	import { loadLocalWorkspaces } from "$lib/ts/WorkspaceLocalStorage";
	import config from "$lib/config.json";
	import {  Mistake, type MistakeHash } from "@shared/diff-engine";
	import LoadingWorkspaceStatus from "./modals/status/LoadingWorkspaceStatus.svelte";
	import type { Submission, SubmissionID, UUID, Workspace } from "@shared/api-types";

	// data: Workspace should be defined for cached workspaces or uploaded workspaces
	let data: Record<string, { key: string, name: string, data?: Workspace }> = {};
	let active = "";
	let workspaceUploader: WorkspaceUploader;
	let workspaceLoader: LoadingWorkspaceStatus;

	async function fetchAvailableWorkspaces() {
		const request = await fetch(`${config.endpointUrl}/api/listWorkspaces`);
		const workspaces: string[] = await request.json();
		for (const workspaceEntry of workspaces) {
			data[workspaceEntry] = {
				key: workspaceEntry,
				name: `${workspaceEntry} (Online)`
			}
		}
	}

	async function loadWorkspace(key: string) {
		if (key === "") {
			// Clear the current workspace
			$workspace = null;
			return;
		}
		
		if (key === "!upload") {
			active = "";

			try {
				// const workspaceData = await workspaceUploader.open();

				// data[workspaceData.key] = {
				// 	key: workspaceData.key,
				// 	name: workspaceData.name,
				// 	data: workspaceData,
				// };

				// data = data; // Update Svelte
				// active = workspaceData.key;

				// $workspace = workspaceData;
			} catch {}

			return;
		}
		
		if (!(key in data)) {
			console.error(`Attempt to open non-existant workspace "${key}"`);
			return;
		}

		if (data[key].data) {
			$workspace = data[key].data!;
			return;
		}

		// TODO: Load server workspaces here
		const requestPromise = fetch(`${config.endpointUrl}/api/exportWorkspace?workspace=${key}`);
		workspaceLoader.open(requestPromise);
		const request = await requestPromise;
		const workspaceRaw = await request.json();
		
		const template = workspaceRaw.template.message;
		const entries: EssayEntry[] = workspaceRaw.submissions
		.map((s: any) => ({
			id: s.id,
			text: s.message,
			mistakes: s.mistakes,
			ignoredText: s.ignoredText
		}))
		.filter((e: EssayEntry) => e.text!.length > template.length * config.incompleteFraction);

		const dataset: Record<string, EssayEntry> = {};

		for (const e of entries) {
			dataset[e.id] = e;
		}

		const tempRegister: any[] = workspaceRaw.register;
		const register: Record<UUID, RegisterEntry> = {};	

		for (const e of tempRegister) {
			register[e._id!] = e;
		}
		
		const w: Workspace = {
			template,
			dataset,
			register,
			local: false,
			name: data[key].name,
			key,
			mistakeData: workspaceRaw.mistakes,
		};

		data[key].data = w;
		// $workspace = w;
	}

	onMount(async () => {
		await $workspaceDatabase!.databaseInit();

		console.log(await $workspaceDatabase!.getAvailableWorkspaces());

		// if (await APP_ONLINE) {
		// 	fetchAvailableWorkspaces();

		// // 	$workspaceSync.addSaveCallback(async (workspace, changes, autosave) => {
		// // 		if(workspace.local) return;

		// // 		let submissions = changes.submissions.map(x => workspace.dataset[x]);
		// // 		let mistakeRecords: Record<MistakeHash, string> = {};
		// // 		let mistakes: WorkspaceMistake[] = [];

		// // 		for(const submission of submissions) {
		// // 			for(const mistake of submission.mistakes!) {
		// // 				if(!(mistake in mistakeRecords) && mistake in workspace.register) {
		// // 					mistakeRecords[mistake] = workspace.register[mistake].hash!;
		// // 				}
		// // 				if(!mistakes.find(x => x.hash === mistake)) {
		// // 					mistakes.push(workspace.mistakeData!.find(x => x.hash === mistake)!);
		// // 				}
		// // 			}
		// // 		}

		// // 		await fetch(`${config.endpointUrl}/api/updateWorkspace?workspace=${workspace.key}`, {
		// // 			method: "POST",
		// // 			headers: new Headers({'content-type': 'application/json'}),
		// // 			body: JSON.stringify({
		// // 				registerChanges: changes.register,
		// // 				registers: changes.register.map(x => workspace.register[x.id]),
		// // 				submissions: submissions,
		// // 				mistakeRecords: mistakeRecords,
		// // 				mistakes: mistakes
		// // 			} as WorkspaceSyncBody)
		// // 		});
		// // 	});
		// // }

		for (const entry of loadLocalWorkspaces()) {
			data[entry.key] = {
				key: entry.key,
				name: entry.name,
				data: entry,
			}
		}

		let pregenWorkspace: Workspace;
		const key = "gurkubluzs";
		const name = "Mazsālīto gurķu blūzs";

		if (!(await $workspaceDatabase!.isWorkspaceInDatabase(key))) {
			const req = await fetch("/output.json");
			const pregen = await req.json();

			const template = pregen.template;
			const entries: Submission[] = pregen.submissions
			.map((s: any) => ({
				id: s.id,
				status: "UNGRADED",
				data: {
					text: s.message,
					mistakes: s.mistakes,
					ignoreText: s.ignoreText,
				}
			}))
			.filter((e: Submission) => e.data!.text.length > template.length * config.incompleteFraction);

			const submissions: Record<SubmissionID, Submission> = {};

			for (const e of entries) {
				submissions[e.id] = e;
			}

			const tempRegister: RegisterEntry[] = JSON.parse(localStorage.getItem("temp-register") ?? "[]");
			const register: Record<MistakeHash, RegisterEntry> = {};	

			// for (const e of tempRegister) {
			// 	register[e.hash!] = e;
			// }

			const mistakeData: WorkspaceMistake[] = [];

			for (const m of pregen.mistakes) {
				// const initActions: Action[] = [];

				// for (const a of m.actions) {
				// 	initActions.push(new Action(a));
				// }

				// mistakeData.push({
				// 	mistake: Mistake.fromData({
				// 		actions: m.actions,
				// 		boundsCheck: m.boundsCheck,
				// 		boundsCorrect: m.boundsCorrect,
				// 		boundsDiff: m.boundsDiff,
				// 		type: m.type,
				// 		subtype: m.subtype,
				// 		word: m.word,
				// 		id: m.id,
				// 	}),
				// 	hash: m.hash,
				// 	occurrences: m.occurrences,
				// 	workspace: key
				// });
			}
			
			pregenWorkspace = {
				id: "tempID",
				template,
				submissions,
				register,
				name,
				key,
				mistakeData,
			};

			console.log(pregenWorkspace);

			data[key] = { key, name, data: pregenWorkspace };

			// $workspaceDatabase!.addWorkspace(pregenWorkspace);
		} else {
			// pregenWorkspace = await $workspaceDatabase!.getWorkspace(key);
		
			// const parsedMistakeData: WorkspaceMistake[] = [];

			// for (const wsMistake of pregenWorkspace.mistakeData) {
			// 	const m = wsMistake.mistake;

			// 	parsedMistakeData.push({
			// 		mistake: new Mistake({
			// 			actions: m.actions,
			// 			boundsCheck: m.boundsCheck,
			// 			boundsCorrect: m.boundsCorrect,
			// 			boundsDiff: m.boundsDiff,
			// 			type: m.type,
			// 			subtype: m.subtype,
			// 			word: m.word
			// 		}),
			// 		hash: wsMistake.hash,
			// 		occurrences: wsMistake.occurrences,
			// 		workspace: key
			// 	});
			// }

			// pregenWorkspace.mistakeData = parsedMistakeData;
		}

		// data[key] = { key, name, data: pregenWorkspace };
	});
</script>

<div class="workspace-selector">
	<select bind:value={active} on:change={() => { loadWorkspace(active); }}>
		<option value="">- Izvēlēties datus -</option>
		{#each Object.values(data) as workspace}
			<option value="{workspace.key}">{workspace.name}</option>
		{/each}
		{#if !config.pilotMode}
		<option value="!upload">- Augšupielādēt datus -</option>
		{/if}
	</select>
</div>

<WorkspaceUploader bind:this={workspaceUploader} />
<LoadingWorkspaceStatus bind:this={workspaceLoader} />

<style lang="scss">
	@import "../scss/global.scss";

	.workspace-selector {
		grid-area: workspace;
		@include dropdown($HEADER_HEIGHT);
	}
</style>