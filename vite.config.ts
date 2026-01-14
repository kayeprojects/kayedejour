import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split lucide-react icons into separate chunk for better caching
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Split React ecosystem into vendor chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Split animation libraries
          if (id.includes('framer-motion') || id.includes('lenis')) {
            return 'vendor-motion';
          }
          // Split editor dependencies
          if (id.includes('@tiptap/')) {
            return 'vendor-tiptap';
          }
          // Split database and sync utilities
          if (id.includes('dexie') || id.includes('@supabase/')) {
            return 'vendor-data';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
  }
})
