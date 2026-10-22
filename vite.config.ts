import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works from any folder, including
  // GitHub Pages (https://<user>.github.io/<repo>/).
  base: './',
  plugins: [react(), tailwindcss()],
})
