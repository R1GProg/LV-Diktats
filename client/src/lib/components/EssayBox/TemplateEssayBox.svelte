<script lang="ts">
	import { ToolbarMode } from "$lib/ts/toolbar";
	import EssayBox from "./EssayBox.svelte";
	import store, { type Stores } from "$lib/ts/stores";

	const workspace = store("workspace") as Stores["workspace"];
	const mode = store("mode") as Stores["mode"];
	let text = "";

	$: if ($workspace !== null) {
		$workspace.then((ws) => { text = ws.template });
	} else {
		text = "";
	}
</script>

<EssayBox
	text={text}
	editable={$mode === ToolbarMode.EDIT}
/>