<script lang="ts">
	import { ToolbarMode } from "$lib/ts/toolbar";
	import EssayBox from "./EssayBox.svelte";
	import { mode, workspace } from "$lib/ts/stores";

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