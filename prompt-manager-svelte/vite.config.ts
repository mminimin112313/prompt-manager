import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 2731,
		host: true
	},
	preview: {
		port: 2731,
		host: true
	}
});
