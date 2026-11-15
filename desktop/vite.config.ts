import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// La app de escritorio reutiliza motor, vistas y estilos del proyecto web
// mediante el alias '@' apuntando a ../src.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  // evita que Vite advierta por código compartido fuera de root
  server: {
    fs: {
      allow: ['..'],
    },
  },
  clearScreen: false,
})
