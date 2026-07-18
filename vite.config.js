import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Kiosk mode is intentionally same-origin so a Cloudflare Tunnel can proxy
  // both the UI and the local DSLR service without any mixed-content request.
  define: {
    'import.meta.env.VITE_KIOSK_SAME_ORIGIN': JSON.stringify(mode === 'kiosk' ? 'true' : process.env.VITE_KIOSK_SAME_ORIGIN || ''),
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['photo-box.my.id', 'www.photo-box.my.id']
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['photo-box.my.id', 'www.photo-box.my.id']
  }
}))
