<script lang="ts">
	export let popupContent = { title: "Hello world!", text: "input here" };

	let inputValue: string = "";
	let active = false;
	let promptResolve: (val: string) => void;
	let promptReject: () => void;

	export function promptForValue(content: { title: string, text: string }) {
		inputValue = "";
		popupContent = content;
		active = true;

		return new Promise<string>((res, rej) => {
			promptResolve = res;
			promptReject = rej;
		});
	}

	function onCancelClick() {
		if (!active) return;

		promptReject();
		active = false;
	}

	function onOkClick() {
		if (!active) return;

		promptResolve(inputValue);
		active = false;
	}

	function inputKeyPressHandler(e: KeyboardEvent) {
		if (e.key !== "Enter") return;

		onOkClick();
	}


	function windowKeyPressHandler(e: KeyboardEvent) {
		if (!active) return;
		if (e.key !== "Escape") return;

		onCancelClick();
	}
</script>

<svelte:window on:keydown={windowKeyPressHandler}/>

<div class="container" class:active={active} on:click|self={onCancelClick}>
	<div class="popup">
		<h2 class="title">{popupContent.title}</h2>
		<input type="text" placeholder="{popupContent.text}" bind:value={inputValue} on:keypress={inputKeyPressHandler}>
		
		<div class="btnContainer">
			<button on:click={onCancelClick}>Atcelt</button>
			<button on:click={onOkClick}>Ok</button>
		</div>
	</div>
</div>

<style lang="scss">
	.container {
		position: absolute;
		z-index: 100;
		width: 100vw;
		height: 100vh;
		top: 0;
		left: 0;

		background-color: rgba(0,0,0,0.85);
		display: none;

		&.active {
			display: block;
		}
	}

	.popup {
		background-color: white;
		
		padding: 10px;
		width: calc(20vw - 20px);
		position: relative;
		left: 40vw;
		top: 40vh;

		display: grid;
		row-gap: 10px;

		h2 {
			margin: 0;
		}
	}

	.btnContainer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 5%;

		button {
			cursor: pointer;
		}
	}
</style>