import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
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

export default defineConfig({
  plugins: [react()],
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
      perfCpu: process.env.PERF_CPU ?? '1',
      perfEvents: process.env.PERF_EVENTS ?? '1',
      perfReact: reactBuild
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
