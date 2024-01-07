import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'
import terser from '@rollup/plugin-terser';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    lib: {
      entry: resolve(__dirname, 'src/components/App.tsx'),
      name: 'react-paint',
      fileName: 'react-paint',
    },

    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        assetFileNames: 'react-paint.css',
        generatedCode: "es2015"
      },
      plugins: [terser()]
    }
  },
  plugins: [react(), tsconfigPaths()],
})
