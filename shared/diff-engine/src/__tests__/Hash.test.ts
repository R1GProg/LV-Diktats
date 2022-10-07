import { hash, initXXHash, hashFunc } from "../xxhash";

describe("Hashing", () => {
	test("Load XXHash64 function", async () => {
		await initXXHash();

		expect(hashFunc !== null).toBeTruthy();
	});

	test("XXHash64", async () => {
		const input = [1, 3, 3, 7];
		const expectedHash = "95cb60ce6e59bce";
		const calcHash = await hash(new Uint8Array(input));

		expect(calcHash).toBe(expectedHash);
	});
});