import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'

const dirname = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // the benchmark (tests/perf/*.perf.test.tsx) is not matched
          include: ['tests/**/*.test.ts']
        }
      },
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(dirname, '.storybook') })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }]
          }
        }
      },
      // Performance benchmark, only run manually with `pnpm bench` (see tests/perf/README.md)
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'perf',
          include: ['tests/perf/**/*.perf.test.tsx'],
          testTimeout: 600_000,
          provide: {
            perfLabel: process.env.PERF_LABEL ?? 'latest',
            perfShapes: process.env.PERF_SHAPES ?? '50,500'
          },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 1280, height: 900 }
          }
        }
      }
    ]
  }
})
