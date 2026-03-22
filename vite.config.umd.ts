import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      fileName: () => 'react-paint.umd.cjs',
      name: 'ReactPaint',
    },
    rolldownOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        format: 'umd',
        globals: {
          react: 'React',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: 'react-paint.css',
        minify: true,
        generatedCode: { preset: 'es2015' }
      }
    }
  },
  plugins: [react()]
})
