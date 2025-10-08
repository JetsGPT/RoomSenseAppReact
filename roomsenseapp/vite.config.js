import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('./certificates/cert.key'),
      cert: fs.readFileSync('./certificates/cert.crt'),
    },
    host: true, // Allow external connections
  },
})
