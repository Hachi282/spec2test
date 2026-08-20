import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' → relative asset paths, so the static build works on GitHub Pages under
// any /<repo>/ subpath without hardcoding the repository name.
export default defineConfig({
  plugins: [vue()],
  base: './',
})
