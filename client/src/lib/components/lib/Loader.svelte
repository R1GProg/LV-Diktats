<span class="loader"></span>

<style lang="scss">
	@import "../../scss/global";

	.loader {
		width: 48px;
		height: 48px;
		border: 5px solid $COL_BG_LIGHT;
		border-bottom-color: $COL_ACCENT_AUX;
		border-radius: 50%;
		display: inline-block;
		box-sizing: border-box;
		animation: rotation 1s linear infinite;
	}
	
	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>