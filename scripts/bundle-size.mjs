// Measures the size of the build (run `pnpm build` first): the files of the package, and the bundles of apps importing
// parts of the library, minified, React left out. Their sizes compressed with gzip are checked against the budgets of
// scripts/bundle-size-budget.json, in kB: a size over its budget fails the script. In the CI, the tables also go to the
// summary of the job.
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { formatTextTable } from '../tests/perf/report.ts'
import { bundleApps, DIST_DIR } from './lib/bundle.mjs'

const BUDGET_FILE = resolve(import.meta.dirname, 'bundle-size-budget.json')

/** What an app imports from the library: its bundle holds the code they need, and nothing else */
const APPS = [
  { from: 'react-paint.js', imports: 'Canvas, useReactPaint' },
  { from: 'react-paint.js', imports: 'Canvas, Editor, useReactPaint' },
  { from: 'react-paint.js', imports: 'Canvas, connectPerformanceTimeline, useReactPaint' }
]

/** Sizes in bytes, compressed at the best level, as by a server which compresses the files ahead */
const measure = content => ({
  raw: Buffer.byteLength(content),
  gzip: gzipSync(content, { level: 9 }).length,
  brotli: brotliCompressSync(content).length
})

const formatSize = bytes => `${(bytes / 1000).toFixed(1)} kB`

/** Markdown table under its title: the first row is the header, the names of the first column are code */
const formatMarkdownTable = (title, [header, ...rows]) =>
  [
    `#### ${title}`,
    '',
    `| ${header.join(' | ')} |`,
    `| --- |${' ---: |'.repeat(header.length - 1)}`,
    ...rows.map(([name, ...sizes]) => `| \`${name}\` | ${sizes.join(' | ')} |`)
  ].join('\n')

// Vite bundles the apps while the files are compressed
const codes = bundleApps(APPS, { minify: true })
// the chunks are named without their hash, which changes with their content
const files = readdirSync(DIST_DIR, { recursive: true })
  .map(file => file.replaceAll('\\', '/'))
  .filter(file => /\.(c?js|css)$/.test(file))
  .sort()
  .map(file => ({ name: file.replace(/^(_chunks\/.+)-[\w-]{8}\.js$/, '$1.js'), ...measure(readFileSync(join(DIST_DIR, file))) }))
const apps = (await codes).map((code, index) => ({ name: APPS[index].imports, ...measure(code) }))

/** @type {Record<string, number>} */
const budgets = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'))
const sizes = [...files, ...apps]
const failures = Object.entries(budgets).flatMap(([name, budget]) => {
  const size = sizes.find(row => row.name === name)
  if (!size) return [`${name}: no such size, remove its budget`]
  return size.gzip > budget * 1000 ? [`${name}: ${formatSize(size.gzip)} with gzip, over its budget of ${budget} kB`] : []
})

const formatRows = (firstColumn, rows) => [
  [firstColumn, 'raw', 'gzip', 'brotli', 'budget (gzip)'],
  ...rows.map(({ name, raw, gzip, brotli }) => [name, formatSize(raw), formatSize(gzip), formatSize(brotli), name in budgets ? `${budgets[name]} kB` : ''])
]
const tables = [
  ['files of the package', formatRows('file', files)],
  ['bundles of an app, minified, React left out', formatRows('imports', apps)]
]
const NOTE = 'kB of 1000 bytes. gzip at level 9, brotli at quality 11.'
const failureText = failures.length
  ? `${failures.map(failure => `- ${failure}`).join('\n')}\n\nReduce the size, or raise its budget in scripts/bundle-size-budget.json and explain why in the pull request.`
  : ''

console.log(tables.map(([title, rows]) => formatTextTable(title, rows)).join('\n\n'))
console.log(`\n${NOTE}`)

// the summary of the job in the CI, failures included
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = ['### Bundle size', ...tables.map(([title, rows]) => formatMarkdownTable(title, rows)), NOTE, failureText].filter(Boolean)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n\n')}\n`)
}

if (failureText) {
  console.error(`\n${failureText}`)
  process.exitCode = 1
}
