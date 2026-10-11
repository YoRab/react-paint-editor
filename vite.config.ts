import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    emptyOutDir: false,
    lib: {
      entry: {
        'react-paint': resolve(import.meta.dirname, 'src/index.tsx'),
        'canvas/index': resolve(import.meta.dirname, 'src/canvas/index.tsx'),
        'editor/index': resolve(import.meta.dirname, 'src/editor/index.tsx')
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    rolldownOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        format: 'es',
        assetFileNames: 'react-paint.css',
        chunkFileNames: '_chunks/[name]-[hash].js',
minify: true,
        generatedCode: { preset: 'es2015' }
      }
    }
  },
  plugins: [react()]
})
