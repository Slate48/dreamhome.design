import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
// base44 fully removed (build is 100% Cloudflare now). The `@` -> src alias below
// replaces the one the former @base44/vite-plugin injected; the plugin's other
// features (HMR/navigation notifiers, analytics, visual-edit agent) were base44
// editor integrations and are gone with base44's disconnection.
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
