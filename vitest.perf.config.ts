import { resolve } from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Performance benchmark, only run manually with `pnpm bench` (see tests/perf/README.md)

/**
 * The build of React measured. 'production' is the one the users of the library run, with the profiling build of
 * react-dom, whose <Profiler> still reports the commits. 'development' is the one the reports made before 2026-11-25
 * measured, slower
 */
const reactBuild = process.env.PERF_REACT === 'development' ? 'development' : 'production'
// React picks its build from it when its package is bundled, and the React plugin its JSX transform
if (reactBuild === 'production') process.env.NODE_ENV = 'production'

const toModulePath = (path: string) => `${resolve(path, 'src').replaceAll('\\', '/')}/`

/**
 * Serves the library measured: the copy of a version made by `pnpm bench:compare` in the folder PERF_SOURCE, in place of
 * the library of the working tree, whatever the path which imports it. The imports of the copy itself are resolved with
 * its own tsconfig files, the nearest ones
 */
const measuredLibrary = (source: string): Plugin => {
  const workingTree = toModulePath('.').toLowerCase()
  const copy = toModulePath(source)
  return {
    name: 'perf-measured-library',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      const resolved = await this.resolve(id, importer, { ...options, skipSelf: true })
      const path = resolved?.id.replaceAll('\\', '/')
      return path?.toLowerCase().startsWith(workingTree) ? copy + path.slice(workingTree.length) : null
    }
  }
}

export default defineConfig({
  plugins: [react(), ...(process.env.PERF_SOURCE ? [measuredLibrary(process.env.PERF_SOURCE)] : [])],
  resolve: {
    tsconfigPaths: true,
    // react-dom/client takes createRoot from react-dom: both are the profiling build
    alias: reactBuild === 'production' ? [{ find: /^react-dom(\/client)?$/, replacement: 'react-dom/profiling' }] : []
  },
  test: {
    name: 'perf',
    include: ['tests/perf/**/*.perf.test.tsx'],
    testTimeout: 600_000,
    provide: {
      perfLabel: process.env.PERF_LABEL ?? 'latest',
      perfShapes: process.env.PERF_SHAPES ?? '50,500',
      perfScenarios: process.env.PERF_SCENARIOS ?? '',
      perfCpu: process.env.PERF_CPU ?? '1',
      perfEvents: process.env.PERF_EVENTS ?? '1',
      perfReact: reactBuild,
      // the report the results are compared to, results/<name>.json: empty for none
      perfBaseline: process.env.PERF_BASELINE ?? 'baseline'
    },
    browser: {
      enabled: true,
      headless: true,
      // the density of the screen: 2 stands for a HiDPI screen, whose canvases have 4 times more pixels
      provider: playwright({ contextOptions: { deviceScaleFactor: Number(process.env.PERF_DPR) || 1 } }),
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1280, height: 900 }
    }
  }
})
