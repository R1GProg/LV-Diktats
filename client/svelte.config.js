import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess({
		scss: {
			// importers: [{
			// 	findFileUrl(url) {
			// 		console.log(url)
			// 		return new URL("dicks");
			// 	}
			// }]
		}
	}),

	kit: {
		adapter: adapter({ out: "build" }),
	},
};

export default config;
