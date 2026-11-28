// Writes the report of the micro-benchmarks, and compares it with the baseline. Given by its path to vitest.micro.config.ts:
// it runs in the process of Vitest, the benchmarks in a worker

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, platform, release } from 'node:os'
import { join } from 'node:path'
import type { TestBenchmark } from 'vitest'
import type { Reporter, TestCase, Vitest } from 'vitest/node'
import { formatJson, formatTextTable, formatTimeGap, roundSignificant } from '../report'

/** The figures of a benchmark: the duration of a call, in ms, over all the calls of its run */
type MicroResult = { meanMs: number; p50Ms: number; p75Ms: number; p99Ms: number; rme: number; calls: number }

type MicroReport = {
  label: string
  date: string
  node: string
  cpu: string | undefined
  os: string
  /** By "test › benchmark" */
  results: Record<string, MicroResult>
  /**
   * The mean of each benchmark, by "test › benchmark", in the format of the samples of the benchmark: pnpm bench:compare
   * --micro compares the ones of the runs of two versions
   */
  samples: Record<string, { meanMs: number }[]>
}

/**
 * Writes the results of the benchmarks to tests/perf/results/micro-<label>.json, and prints their means, with the gap to
 * the report micro-<baseline>.json if any (empty for none). Vitest builds it with new, from its path and its options
 */
export default class MicroReporter implements Reporter {
  private readonly label: string
  private readonly baseline: string
  private readonly results: Record<string, MicroResult> = {}
  private resultsDir = ''

  constructor({ label, baseline }: { label: string; baseline: string }) {
    this.label = label
    this.baseline = baseline
  }

  private getFile(label: string) {
    return join(this.resultsDir, `micro-${label}.json`)
  }

  onInit(vitest: Vitest) {
    this.resultsDir = join(vitest.config.root, 'tests/perf/results')
  }

  onTestCaseBenchmark(testCase: TestCase, { tasks }: TestBenchmark) {
    for (const { name, latency } of tasks) {
      this.results[`${testCase.fullName} › ${name}`] = {
        meanMs: latency.mean,
        p50Ms: latency.p50,
        p75Ms: latency.p75,
        p99Ms: latency.p99,
        rme: latency.rme,
        calls: latency.samplesCount
      }
    }
  }

  onTestRunEnd() {
    const { label, baseline, results } = this
    const keys = Object.keys(results)
    if (!keys.length) return
    const report: MicroReport = {
      label,
      date: new Date().toISOString(),
      node: process.version,
      cpu: cpus()[0]?.model,
      os: `${platform()} ${release()}`,
      results,
      samples: Object.fromEntries(keys.map(key => [key, [{ meanMs: results[key]!.meanMs }]]))
    }
    writeFileSync(this.getFile(label), formatJson(report))

    // the baseline itself is compared to nothing
    const baseFile = this.getFile(baseline)
    const baseReport =
      baseline && baseline !== label && existsSync(baseFile) ? (JSON.parse(readFileSync(baseFile, 'utf8')) as MicroReport) : undefined
    const formatMean = (key: string) => {
      const { meanMs } = results[key]!
      const baseMs = baseReport?.results[key]?.meanMs
      return baseMs === undefined ? `${roundSignificant(meanMs)}` : `${roundSignificant(meanMs)} ${formatTimeGap(baseMs, meanMs)}`
    }
    console.log(
      [
        formatTextTable(`Micro-benchmarks "${label}"${baseReport ? `, compared to micro-${baseline}.json` : ''}`, [
          ['benchmark', 'mean of a call (ms)'],
          ...keys.map(key => [key, formatMean(key)])
        ]),
        baseReport
          ? 'The gaps are not marked: they may come from the drift of the machine between the two runs. To compare two versions, use pnpm bench:compare --micro'
          : '',
        `Written to tests/perf/results/micro-${label}.json`
      ]
        .filter(Boolean)
        .join('\n\n')
    )
  }
}
