<script lang="ts">
	import { ToolbarMode } from "$lib/ts/toolbar";
	import EssayBox from "./EssayBox.svelte";
	import { mode, workspace } from "$lib/ts/stores";

	$: text = $workspace?.template ?? "";
</script>

<EssayBox
	text={text}
	editable={$mode === ToolbarMode.EDIT}
/>