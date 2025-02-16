import config from "$lib/config.json";

export const APP_ONLINE: Promise<boolean> = new Promise(async (res, rej) => {
	try {
		const isOnline = (await fetch(config.endpointUrl)).status === 200;

		console.log(isOnline ? "ONLINE MODE" : "OFFLINE MODE");

		res(isOnline);
	} catch (err) {
		console.log("OFFLINE MODE");
		res(false);
	}
});
