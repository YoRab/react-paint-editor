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
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'react-paint',
      fileName: 'react-paint'
    },

    rolldownOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        assetFileNames: 'react-paint.css',
        minify: true,
        generatedCode : {
          preset: 'es2015'
        }
      },
    }
  },
  plugins: [react()]
})
