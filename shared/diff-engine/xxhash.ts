let hashFunc: any | null = null;

async function initXXHash() {
	if (hashFunc !== null) return;

	if (typeof window === undefined) {
		hashFunc = (await import("xxhash")).default.hash64;
	} else {
		const xxhash = (await import("xxhash-wasm")).default;
		const api = await xxhash();
		hashFunc = api.h64;
	}
}

export function hash(dataBuf: ArrayBuffer) {
	return new Promise<string>(async (res, rej) => {
		await initXXHash();

		// If Node, use the Native wrapper, if browser, use WASM
		if (typeof window === undefined) {
			res(hashFunc(dataBuf, 0xB00B135));
		} else {
			res(hashFunc(new Uint8Array(dataBuf).toString()).toString(16));
		}
	});
}
