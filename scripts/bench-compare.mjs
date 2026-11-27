// Compares the performance of the library at a git ref with the working tree: `pnpm bench:compare [--micro] <ref> [vitest
// args]`, with the benchmark, or with the micro-benchmarks. They are the ones of the working tree for both: only the
// library changes (see tests/perf/README.md).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, platform, release } from 'node:os'
import { join, relative, resolve } from 'node:path'
import {
  adjustComparisons,
  COMPARISON_LEGEND,
  compareSamples,
  formatComparison,
  formatJson,
  formatTextTable,
  listSignificant,
  round,
  roundSignificant
} from '../tests/perf/report.ts'

const ROOT = resolve(import.meta.dirname, '..')
const VARIANTS_DIR = join(ROOT, '.bench-variants')
const RESULTS_DIR = join(ROOT, 'tests/perf/results')
/** The library, and the configs which give the paths of its imports */
const SOURCES = ['src', 'tsconfig.json', 'tsconfig.prod.json']
const VARIANTS = ['base', 'current']

/**
 * What a round runs: the benchmark, as `pnpm bench` (its config also holds the check of the counts), which measures 5 runs
 * of each scenario, or the micro-benchmarks, as `pnpm bench:micro`, which give a single sample of each benchmark: a run
 * of the same code differs from the next by more than the error margin of its calls. Both give 10 samples per variant by
 * default
 */
const TARGETS = {
  benchmark: {
    args: ['--config', 'vitest.perf.config.ts', '--reporter=default', 'tests/perf/interactions'],
    /** Of the reports, in tests/perf/results */
    filePrefix: '',
    rounds: 2,
    describe: report => `${report.react} build of React`,
    format: round,
    /** A table per scenario and size, with a row per metric */
    formatTables: (keys, comparisons, columns) =>
      keys.map(key =>
        formatTextTable(key, [['metric', ...columns], ...Object.entries(comparisons[key]).map(([metric, comparison]) => [metric, ...formatCells(comparison)])])
      )
  },
  micro: {
    args: ['--config', 'vitest.micro.config.ts'],
    filePrefix: 'micro-',
    rounds: 10,
    describe: report => `Node ${report.node}`,
    format: roundSignificant,
    /** A single table: a micro-benchmark has a single metric, the mean of a call */
    formatTables: (keys, comparisons, columns) => [
      formatTextTable('mean of a call (ms)', [['benchmark', ...columns], ...keys.map(key => [key, ...formatCells(comparisons[key].meanMs)])])
    ]
  }
}

const args = process.argv.slice(2)
const target = TARGETS[args.includes('--micro') ? 'micro' : 'benchmark']
/** Each round runs both variants, the first one alternating: an even number gives both the same positions */
const ROUNDS = Math.max(1, Math.floor(Number(process.env.PERF_ROUNDS)) || target.rounds)

const [ref = 'HEAD', ...vitestArgs] = args.filter(arg => arg !== '--micro')
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
const sha = git('rev-parse', '--verify', `${ref}^{commit}`).toString().trim()
const label = process.env.PERF_LABEL || `compare-${ref.replace(/[^\w.-]+/g, '-')}`

const listFiles = (directory, prefix = '') =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory() ? listFiles(join(directory, entry.name), name) : [name]
  })

/** Tells the variants apart in the report: the same hash means the same library, whatever the line endings of the working tree */
const hashDirectory = directory => {
  const hash = createHash('sha256')
  for (const file of listFiles(directory).sort()) hash.update(file).update(readFileSync(join(directory, file), 'utf8').replaceAll('\r\n', '\n'))
  return hash.digest('hex').slice(0, 16)
}

/** The library at the ref, checked out by a single git command. A temporary index leaves the one of the repository alone */
const extractRef = directory => {
  mkdirSync(directory, { recursive: true })
  const index = `${directory}.index`
  try {
    execFileSync('git', ['--work-tree', directory, 'checkout', sha, '--', ...SOURCES], { cwd: ROOT, env: { ...process.env, GIT_INDEX_FILE: index } })
  } finally {
    rmSync(index, { force: true })
  }
}

/** The library of the working tree, copied so that a change made during the comparison does not reach it */
const copyWorkingTree = directory => {
  for (const source of SOURCES) cpSync(join(ROOT, source), join(directory, source), { recursive: true })
}

const runVariant = (variant, roundIndex) => {
  const runLabel = `${label}.${variant}.${roundIndex}`
  console.log(`\n━━ Round ${roundIndex + 1}/${ROUNDS}: ${variant} ━━`)
  try {
    execFileSync(
      process.execPath,
      [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...target.args, ...vitestArgs],
      {
        cwd: ROOT,
        stdio: 'inherit',
        // no baseline: the comparison is made here, between the rounds
        env: { ...process.env, PERF_SOURCE: join(VARIANTS_DIR, variant), PERF_LABEL: runLabel, PERF_BASELINE: '' }
      }
    )
  } catch {
    // a scenario which fails, like one the base does not know, leaves the others in the report
    console.warn(`Round ${roundIndex + 1}, ${variant}: some scenarios failed, the report holds the others`)
  }
  const file = join(RESULTS_DIR, `${target.filePrefix}${runLabel}.json`)
  if (!existsSync(file)) return undefined
  const report = JSON.parse(readFileSync(file, 'utf8'))
  rmSync(file)
  return report
}

const { format } = target
const formatSummary = ({ median, p25, p75 }) => (p25 === p75 ? `${format(median)}` : `${format(median)} [${format(p25)}–${format(p75)}]`)

/** The cells of a metric compared: both variants, the gap, and the p-value, except for the counts, compared without test */
const formatCells = comparison => [
  formatSummary(comparison.base),
  formatSummary(comparison.next),
  formatComparison(comparison),
  comparison.constant ? '' : comparison.p.toPrecision(2)
]

rmSync(VARIANTS_DIR, { recursive: true, force: true })
try {
  extractRef(join(VARIANTS_DIR, 'base'))
  copyWorkingTree(join(VARIANTS_DIR, 'current'))
  const sourceHashes = Object.fromEntries(VARIANTS.map(variant => [variant, hashDirectory(join(VARIANTS_DIR, variant))]))
  if (sourceHashes.base === sourceHashes.current) console.log(`The library is the same at ${ref} and in the working tree: an A/A control`)

  /** Samples of each metric, by variant then by "scenario@shapes" */
  const samples = { base: {}, current: {} }
  let lastReport
  for (let roundIndex = 0; roundIndex < ROUNDS; roundIndex++) {
    for (const variant of roundIndex % 2 ? [...VARIANTS].reverse() : VARIANTS) {
      const report = runVariant(variant, roundIndex)
      if (!report) continue
      lastReport = report
      for (const [key, runs] of Object.entries(report.samples ?? {})) {
        const series = (samples[variant][key] ??= {})
        for (const run of runs) for (const [metric, value] of Object.entries(run)) (series[metric] ??= []).push(value)
      }
    }
  }
  if (!lastReport) throw new Error('No round gave a report')

  const keys = Object.keys(samples.current).filter(key => samples.base[key])
  const missing = [...new Set([...Object.keys(samples.base), ...Object.keys(samples.current)])].filter(key => !keys.includes(key))
  // the p-values are adjusted for the number of times compared over all the scenarios
  const comparisons = adjustComparisons(
    Object.fromEntries(
      keys.map(key => [
        key,
        Object.fromEntries(Object.keys(samples.current[key]).map(metric => [metric, compareSamples(samples.base[key][metric], samples.current[key][metric])]))
      ])
    )
  )

  const header = `Comparison "${label}": ${ref} (${sha.slice(0, 8)}) against the working tree, ${ROUNDS} rounds, ${target.describe(lastReport)}`
  const tables = target.formatTables(keys, comparisons, [`base (${ref})`, 'current', 'gap', 'p adjusted'])
  const significant = listSignificant(comparisons, format)
  console.log(
    [
      header,
      `Median of the samples [first quartile–third quartile]. ${COMPARISON_LEGEND}`,
      ...tables,
      significant.length ? `Significant differences:\n${significant.join('\n')}` : 'No significant difference',
      missing.length ? `Measured for one variant only (failed for the other): ${missing.join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('\n\n')
  )

  const report = {
    label,
    date: new Date().toISOString(),
    ref,
    sha,
    sourceHashes,
    rounds: ROUNDS,
    node: process.version,
    cpu: cpus()[0]?.model,
    os: `${platform()} ${release()}`,
    userAgent: lastReport.userAgent,
    react: lastReport.react,
    cpuRate: lastReport.cpuRate,
    eventsPerFrame: lastReport.eventsPerFrame,
    pixelRatio: lastReport.pixelRatio,
    gpu: lastReport.gpu,
    comparisons,
    samples
  }
  const output = join(RESULTS_DIR, `${target.filePrefix}${label}.json`)
  writeFileSync(output, formatJson(report))
  console.log(`\nWritten to ${relative(ROOT, output)}`)
} finally {
  rmSync(VARIANTS_DIR, { recursive: true, force: true })
}
