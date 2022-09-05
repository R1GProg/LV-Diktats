import adapter from '@sveltejs/adapter-auto';
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
		adapter: adapter(),
	},
};

export default config;
