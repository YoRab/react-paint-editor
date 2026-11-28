// Measures the reference figures of the Performance page of the documentation: `pnpm bench:reference` runs the stress test
// in 6 conditions, CPU 1× and 4×, pixel ratio 1 and 2, with the GPU or software rendering, in about 2 hours and a half, then writes them to
// stories/assets/perf-reference.json. `pnpm bench:reference cpu4-dpr2` measures a condition again, `--write-only` writes the
// file from the reports already measured. Run it on an idle machine, plugged in (see tests/perf/README.md).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, totalmem, version } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { getCapacity } from '../tests/perf/capacity.ts'
import { formatJson, isSoftwareGpu } from '../tests/perf/report.ts'
import { STRESS_GESTURES as GESTURES } from '../tests/perf/stress-gestures.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT = join(ROOT, 'stories/assets/perf-reference.json')

/** The operations, measured in each condition with the gestures of the tables of the page */
const OPERATIONS = ['load', 'export-data', 'export-image']
/** The scenarios of the tips of the page, measured in the first condition only: a tip compares them with the gestures of the same run */
const TIP_SCENARIOS = [
  'translate-group',
  'translate-group-opacity',
  'translate-all-shapes-changed',
  'long-brush',
  'translate-long-brush',
  'translate-custom',
  'pictures'
]

/**
 * The GPU of the machine draws the canvases, like in the browsers of the users, except in the conditions of the software
 * rendering: SwiftShader, the software GPU of headless Chromium, draws them with the CPU, like a browser without GPU
 * acceleration (a GPU on its blocklist, a virtual machine)
 */
const CONDITIONS = {
  'cpu1-dpr1': { cpuRate: 1, pixelRatio: 1, gpu: true, gestures: [...GESTURES, ...TIP_SCENARIOS] },
  'cpu4-dpr1': { cpuRate: 4, pixelRatio: 1, gpu: true, gestures: GESTURES },
  'cpu1-dpr2': { cpuRate: 1, pixelRatio: 2, gpu: true, gestures: GESTURES },
  'cpu4-dpr2': { cpuRate: 4, pixelRatio: 2, gpu: true, gestures: GESTURES },
  'software-dpr1': { cpuRate: 1, pixelRatio: 1, gpu: false, gestures: GESTURES },
  'software-dpr2': { cpuRate: 1, pixelRatio: 2, gpu: false, gestures: GESTURES }
}

const args = process.argv.slice(2)
const writeOnly = args.includes('--write-only')
const ids = args.filter(arg => arg !== '--write-only')
const unknownIds = ids.filter(id => !(id in CONDITIONS))
if (unknownIds.length) throw new Error(`Unknown conditions: ${unknownIds.join(', ')}. The conditions are ${Object.keys(CONDITIONS).join(', ')}`)

const getReportPath = id => join(ROOT, `tests/perf/results/stress-reference-${id}.json`)

/** Runs the stress test in a condition. A scenario which fails stops the script: its figures would be missing */
const measure = id => {
  const { cpuRate, pixelRatio, gpu, gestures } = CONDITIONS[id]
  // the variables of the benchmark set in the shell would change the figures: only the ones of the condition are given
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('PERF_')))
  console.log(`\n━━ ${id}: CPU ${cpuRate}×, pixel ratio ${pixelRatio}, ${gpu ? 'GPU' : 'software rendering'} ━━`)
  execFileSync(
    process.execPath,
    [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.perf.config.ts', '--reporter=default', 'tests/perf/stress'],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...env,
        PERF_LABEL: `reference-${id}`,
        PERF_CPU: String(cpuRate),
        PERF_DPR: String(pixelRatio),
        ...(gpu ? { PERF_GPU: '1' } : {}),
        PERF_SCENARIOS: [...gestures, ...OPERATIONS].join(',')
      }
    }
  )
}

/** The results of a scenario in a report by number of shapes, which keys of integers keep in increasing order */
const getScenarioResults = (results, scenario) =>
  Object.fromEntries(
    Object.entries(results)
      .filter(([key]) => key.startsWith(`${scenario}@`))
      .map(([key, metrics]) => [key.slice(scenario.length + 1), metrics])
  )

/** A metric of the results of a report, by scenario then by number of shapes: { translate: { 100: 4.5, 500: 6.6 } } */
const byScenario = (results, scenarios, metric) =>
  Object.fromEntries(
    scenarios.map(scenario => [
      scenario,
      Object.fromEntries(Object.entries(getScenarioResults(results, scenario)).map(([size, metrics]) => [size, metrics[metric]]))
    ])
  )

/** The capacity of a gesture, computed again: the reports made before 2026-11-27 counted the work of the frames only */
const getGestureCapacity = (results, gesture) => {
  const bySize = getScenarioResults(results, gesture)
  return getCapacity(Object.keys(bySize).map(Number), size => bySize[size])
}

/** The figures of a condition, from its report, checked against the condition: a report of other runs would mislead */
const readCondition = id => {
  const { cpuRate, pixelRatio, gpu, gestures } = CONDITIONS[id]
  const path = getReportPath(id)
  if (!existsSync(path)) throw new Error(`No report for ${id}: run pnpm bench:reference ${id}`)
  const report = JSON.parse(readFileSync(path, 'utf8'))
  const measured = new Set(Object.keys(report.results).map(key => key.split('@')[0]))
  const missing = [...gestures, ...OPERATIONS].filter(scenario => !measured.has(scenario))
  if (
    report.react !== 'production' ||
    report.eventsPerFrame !== 1 ||
    report.cpuRate !== cpuRate ||
    report.pixelRatio !== pixelRatio ||
    // a report without gpu was made before it was recorded
    report.gpu === undefined ||
    isSoftwareGpu(report.gpu) === gpu ||
    missing.length
  )
    throw new Error(`${relative(ROOT, path)} was not measured in the condition ${id}: run pnpm bench:reference ${id}`)
  return {
    userAgent: report.userAgent,
    gpu: report.gpu,
    // the id of the condition gives its CPU rate, its pixel ratio and its GPU
    figures: {
      date: report.date,
      capacity: Object.fromEntries(gestures.map(gesture => [gesture, getGestureCapacity(report.results, gesture)])),
      frameWorkP95: byScenario(report.results, gestures, 'frameWorkP95'),
      frameIntervalP95: byScenario(report.results, gestures, 'frameP95'),
      operationMs: byScenario(report.results, OPERATIONS, 'totalMs')
    }
  }
}

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: ROOT }).toString().trim()

/** The library measured, like v1.0.0-beta.4-22-gbc4a09c: the last tag, the commits since, the commit. "-dirty" when src was changed */
const describeLibrary = () => `${git('describe', '--tags', '--always', '--abbrev=7')}${git('status', '--porcelain', '--', 'src') ? '-dirty' : ''}`

const start = Date.now()
if (!writeOnly) for (const id of ids.length ? ids : Object.keys(CONDITIONS)) measure(id)

/** The value shared by all the conditions: the figures of several browsers or GPUs would not compare */
const getShared = (name, values) => {
  const distinct = [...new Set(values)]
  if (distinct.length > 1) throw new Error(`The conditions were measured with several ${name}: ${distinct.join(', ')}`)
  return distinct[0]
}

const conditions = Object.keys(CONDITIONS).map(id => [id, readCondition(id)])
const browser = getShared('browsers', conditions.map(([, { userAgent }]) => userAgent.match(/(?:Headless)?Chrome\/[\d.]+/)?.[0]))
const gpu = getShared('GPUs', conditions.filter(([id]) => CONDITIONS[id].gpu).map(([, report]) => report.gpu))

// no array: the formatter of the repository would put their items on a single line. The build of React is always the
// production one, checked in each report
const reference = {
  library: describeLibrary(),
  machine: {
    cpu: cpus()[0]?.model.trim(),
    threads: cpus().length,
    memoryGb: Math.round(totalmem() / 2 ** 30),
    os: version(),
    // "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002216) Direct3D11 vs_5_0 ps_5_0, D3D11)": its name
    gpu: gpu.match(/^ANGLE \([^,]+, (.+?) \(0x/)?.[1] ?? gpu
  },
  browser,
  conditions: Object.fromEntries(conditions.map(([id, { figures }]) => [id, figures]))
}
writeFileSync(OUTPUT, formatJson(reference))
console.log(`\nWritten to ${relative(ROOT, OUTPUT)}${writeOnly ? '' : ` after ${Math.round((Date.now() - start) / 60_000)} minutes`}`)
