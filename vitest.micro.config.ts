import { defineConfig } from 'vitest/config'
import { measuredLibrary } from './scripts/lib/measured-library.mjs'

// Micro-benchmarks of hot functions of the library, run manually in Node with `pnpm bench:micro` (see tests/perf/README.md)

export default defineConfig({
  plugins: process.env.PERF_SOURCE ? [measuredLibrary(process.env.PERF_SOURCE)] : [],
  resolve: {
    tsconfigPaths: true
  },
  test: {
    name: 'micro',
    // Vitest runs the benchmark files in a project of their own, "micro (bench)", one at a time: this one has no tests
    include: [],
    benchmark: {
      enabled: true,
      include: ['tests/perf/micro/**/*.bench.ts'],
      // the tracker which counts the calls of the exports of the modules, for this warning, wraps each one: it made
      // getDataChanges 6 to 10 % slower. Without it, the getters of the module runner cost about 3 %, against a bundle
      suppressExportGetterWarnings: true
    },
    reporters: [
      'default',
      // given by its path, it is loaded by Vitest, which resolves its imports
      ['./tests/perf/micro/reporter.ts', { label: process.env.PERF_LABEL ?? 'latest', baseline: process.env.PERF_BASELINE ?? 'baseline' }]
    ]
  }
})
