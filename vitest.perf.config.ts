import { resolve } from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Performance benchmark, run manually with `pnpm bench`, check of its counts, `pnpm bench:counts`, also run by the CI,
// and stress test, `pnpm bench:stress` (see tests/perf/README.md)

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

/**
 * Gives the tests the flag `-u` of Vitest: `pnpm bench:counts -u` writes the counts measured to counts-baseline.json
 * instead of checking them. Unlike a variable of the environment, it does not stay set in the shell
 */
const updateFlag = (): Plugin => ({
  name: 'perf-update-flag',
  configureVitest({ project }) {
    project.provide('perfUpdate', project.config.snapshotOptions.updateSnapshot === 'all')
  }
})

export default defineConfig({
  plugins: [react(), updateFlag(), ...(process.env.PERF_SOURCE ? [measuredLibrary(process.env.PERF_SOURCE)] : [])],
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
      // empty for the sizes of each test file
      perfShapes: process.env.PERF_SHAPES ?? '',
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
      viewport: { width: 1280, height: 900 },
      // a count over its maximum shows nothing on the page
      screenshotFailures: false
    }
  }
})
