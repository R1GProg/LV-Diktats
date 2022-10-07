import { charIsPunctuation, charIsWordDelimeter } from "../langUtil";

describe("langUtil", () => {
	test("charIsPunctuation matches punctuation", () => {
		expect((() => {
			for (const char of ",.?!\";:-—()") {
				if (!charIsPunctuation(char)) {
					return false;
				}
			}

			return true;
		})()).toBeTruthy();
	});

	test("charIsPunctuation doesn't match letters", () => {
		expect((() => {
			for (const char of "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ") {
				if (charIsPunctuation(char)) {
					return false;
				}
			}

			return true;
		})()).toBeTruthy();
	});

	test("charIsWordDelimeter doesn't match letters or numbers", () => {
		expect((() => {
			for (const char of "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ") {
				if (charIsWordDelimeter(char)) {
					return false;
				}
			}

			return true;
		})()).toBeTruthy();
	});

	test("charIsWordDelimeter matches punctuation, spaces, and new lines", () => {
		expect((() => {
			for (const char of ",.?!\";:-—() \n") {
				if (!charIsWordDelimeter(char)) {
					return false;
				}
			}

			return true;
		})()).toBeTruthy();
	});
});