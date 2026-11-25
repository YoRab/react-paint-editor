import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const dirname = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    // Used by `pnpm test-coverage` (CI badge) and by the coverage option of the Storybook test runner,
    // which keeps include/exclude but replaces the reporters
    coverage: {
      provider: 'v8',
      // without include, Vitest only reports the files loaded by the tests, stories and .storybook included
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text-summary', 'html', 'json-summary']
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // the benchmark (tests/perf/*.perf.test.tsx) is not matched: it has its own config, vitest.perf.config.ts
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
      }
    ]
  }
})
