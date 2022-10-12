<script lang="ts">
	import store, { type Stores } from "$lib/ts/stores";
	import { getAllSubmissionsWithMistakes, deleteAllMatching, deleteFirstMatching } from "$lib/ts/util";
	import type { RegisterEntry, RegisterOptions, Submission, UUID } from "@shared/api-types";
	import type { MistakeHash } from "@shared/diff-engine";
	import { onMount } from "svelte";
	import Modal from "./Modal.svelte";

	const workspace = store("workspace") as Stores["workspace"];
	const ds = store("ds") as Stores["ds"];
	const activeWorkspaceID = store("activeWorkspaceID") as Stores["activeWorkspaceID"];

	let modal: Modal;
	let desc = "";
	let regOpts: RegisterOptions = {
		ignore: false,
		mistakeType: "ORTHO",
		countType: "TOTAL",
	};
	let registerId: UUID;
	let mistakes: { hash: MistakeHash, word: string, submissions: string[] }[] = [];
	let entry: RegisterEntry;
	let closeByEdit = false;

	export async function open(id: UUID) {
		closeByEdit = false;
		const ws = await $workspace;
		
		if (ws === null) return;
		
		const existingEntry = ws.register.find((e) => e.id === id);

		if (!existingEntry) return;

		entry = existingEntry!;
		mistakes = [];

		for (const m of entry.mistakes) {
			mistakes.push({
				hash: m,
				word: entry._mistakeWords![m],
				submissions: getAllSubmissionsWithMistakes(Object.values(ws.submissions) as unknown as Submission[], [ m ]),
			});
		}
		
		registerId = id;
		desc = existingEntry.description;
		regOpts = {...existingEntry.opts};
		mistakes = mistakes;
		
		modal.open();
	}

	function onCancelClick() {
		modal.close();
	}

	async function onDeleteClick() {
		modal.close();

		await $ds.registerDelete({ action: "DELETE", id: registerId }, $activeWorkspaceID!);
	}

	async function onEditClick() {
		const ws = await $workspace;
		if (ws === null) return;

		closeByEdit = true;
		modal.close();

		await $ds.registerUpdate({
			action: "EDIT",
			id: registerId,
			mistakes: mistakes.map((m) => m.hash),
			description: desc,
			opts: regOpts,
		}, $activeWorkspaceID!);
	}

	async function onDeleteEntryClick(hash: MistakeHash) {
		const ws = await $workspace;
		if (ws === null) return;

		deleteFirstMatching(mistakes, (m) => m.hash === hash);
		
		await $ds.registerUpdate({
			action: "EDIT",
			id: registerId,
			mistakes: mistakes.map((m) => m.hash),
			description: desc,
			opts: regOpts,
		}, $activeWorkspaceID!);
	}

	onMount(() => {
		$ds.addRegisterChangeCallback((data) => {
			if (!modal?.isOpen()) return;
			if (closeByEdit) return;

			const changed = data.find((e) => e.entry.id === registerId);

			if (!changed) return;

			if (changed.type === "DELETE") {
				modal.close();
			} else if (changed.type === "EDIT") {
				open(registerId);
			}
		});
	});
</script>

<Modal
	title={"Reģistra ieraksts"}
	bind:this={modal}
>
	<h3 style="margin-top: -1.5rem;">Reģistrētās kļūdas</h3>
	<div class="mistake-outer-container">
		<table class="mistake-container">
			<tr>
				<th><span>Kļūda</span></th>
				<th><span>Kļūdu skaits</span></th>
				<th><span>Iesūtījumu ID</span></th>
			</tr>
			{#each mistakes as m (m.hash)}
			<tr>
				<td class="mistake-word" title={m.word}>
					{m.word.length > 50 ? `${m.word.substring(0, 50)}...` : m.word}
				</td>
				<td>{m.submissions.length}</td>
				<td class="mistake-subm" title={m.submissions.join(", ")}>
					{m.submissions.length > 15
						? `${m.submissions.slice(0, 15).join(", ")}...`
						: m.submissions.join(", ")
					}
				</td>
				<td>
					<button
						class="delete-btn"
						title="Atreģistrēt"
						on:click={() => { onDeleteEntryClick(m.hash) }}
					></button>
				</td>
			</tr>
			{/each}
		</table>
	</div>

	<h3>Ieraksta info</h3>
	<div class="container">
		<label for="regDescription">Kļūdas apraksts</label>
		<textarea
			type="text"
			id="regDescription"
			placeholder="Kļūdas apraksts"
			cols="30"
			rows="5"
			bind:value={desc}
		/>

		<label for="regIgnore">Nav uzskatāma par kļūdu</label>
		<input
			type="checkbox"
			id="regIgnore"
			bind:checked={regOpts.ignore}
		/>

		<label for="regMistakeType">Kļūdas tips</label>
		<div class="selectContainer">
			<select id="regMistakeType" bind:value={regOpts.mistakeType}>
				<option value="ORTHO">Ortogrāfijas</option>
				<option value="PUNCT">Interpunkcijas</option>
				<option value="TEXT">Trūkst teksts</option>
			</select>
		</div>

		<label for="regCountType">Kļūdu skaita vizualizācija</label>
		<div class="selectContainer">
			<select id="regCountType" bind:value={regOpts.countType}>
				<option value="TOTAL">Rādīt kopējo</option>
				<option value="VARIATION">Rādīt katrai variācijai savu</option>
				<option value="NONE">Nerādīt</option>
			</select>
		</div>
	</div>

	<div class="input-container">
		<button on:click={onCancelClick}>Atcelt</button>
		<button on:click={onDeleteClick}>Dzēst</button>
		<button on:click={onEditClick}>Rediģēt</button>
	</div>
</Modal>

<style lang="scss">
	@import "../../scss/global";

	h3 {
		font-family: $FONT_HEADING;
		font-weight: 400;
		margin: 0;
		margin-bottom: 0.5em;
		margin-top: 1em;
		font-size: 1.5rem;
	}
	
	.mistake-outer-container {
		@include scrollbar;

		max-height: 45vh;
		overflow-y: auto;
	}

	.mistake-container {
		margin-bottom: 2vh;
		border-collapse: collapse;
		border-spacing: 0;
		width: 96%;
		margin-left: 2%;

		tr:first-of-type {
			border-bottom: 2px solid $COL_FG_REG;

			th {
				font-family: $FONT_HEADING;
				padding-bottom: 1vh;
			}
		}

		tr {
			border-bottom: 1px solid $COL_BG_LIGHT;
		}

		td {
			font-family: $FONT_BODY;
			text-align: center;
			padding-bottom: 1vh;
			padding-top: 1vh;
		}

		.mistake-subm {
			width: 45%;
		}

		.mistake-word {
			width: 15%;
		}

		.delete-btn {
			@include button_icon(true);

			width: 2vw;
			height: 2vw;

			-webkit-mask-image: url(/icons/icon-close.svg);
			mask-image: url(/icons/icon-close.svg);

			-webkit-mask-size: 90%;
			mask-size: 90%;
		}

		.mistake-subm, .mistake-word {
			transition: background-color 0.3s;
			cursor: pointer;

			&:hover {
				background-color: $COL_BG_LIGHT;
			}
		}
	}

	.container {
		display: grid;
		grid-template-columns: auto 1fr;
		row-gap: 1rem;
		column-gap: 1rem;
		text-align: left;
		padding: 0 1vh 1vh 1vh;

		label {
			font-family: $FONT_HEADING;
		}

		input {
			justify-self: flex-start;
		}
	}

	.input-container {
		display: grid;
		grid-auto-columns: minmax(0, 1fr);
		grid-auto-flow: column;
		column-gap: 3.5%;
		margin-top: 3vh;

		button {
			justify-self: center;

			border: 1px solid $COL_ACCENT;
			background-color: $COL_BG_LIGHT;
			color: white;
			font-family: $FONT_HEADING;
			font-size: 1rem;
			text-transform: uppercase;
			padding: 0.15em 1em;
			width: 100%;

			cursor: pointer;
			transition: background-color 0.3s;

			&:hover {
				background-color: $COL_BG_REG;
			}
		}
	}

	.selectContainer {
		@include dropdown(3rem);
	}
</style>