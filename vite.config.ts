import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// CSS emitted for each module chunk. The aggregated react-paint.css is emitted by the UMD build.
// The canvas has no stylesheet (its styles are inline): any other asset fails the build.
const CSS_FILE_NAMES: Record<string, string> = {
  'editor.css': 'editor/editor.css'
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    cssCodeSplit: true,
    emptyOutDir: false,
    lib: {
      entry: {
        'react-paint': resolve(import.meta.dirname, 'src/index.ts'),
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
        assetFileNames: assetInfo => {
          const cssFileName = assetInfo.names.map(name => CSS_FILE_NAMES[name]).find(Boolean)
          if (!cssFileName) throw new Error(`Unexpected asset: ${assetInfo.names.join(', ')}`)
          return cssFileName
        },
        chunkFileNames: '_chunks/[name]-[hash].js',
        minify: true,
        generatedCode: { preset: 'es2015' }
      }
    }
  },
  plugins: [react()]
})
