import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bisa diakses dari HP/perangkat lain di jaringan yang sama
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-xlsx':     ['xlsx'],
          'vendor-lucide':   ['lucide-react'],
          'vendor-pdfjs':    ['pdfjs-dist'],
        },
      },
    },
  },
})
