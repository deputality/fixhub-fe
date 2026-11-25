import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
      // страницы для превью ссылок в мессенджерах (Open Graph) отдаёт бэкенд
      '/share': 'http://localhost:8080',
    },
  },
})