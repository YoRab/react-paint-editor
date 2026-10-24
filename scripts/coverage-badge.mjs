// Writes coverage/badge.json, a shields.io endpoint (https://shields.io/badges/endpoint-badge) giving the line coverage.
// It reads coverage/coverage-summary.json (run `pnpm test-coverage` first). The deploy workflow publishes both on GitHub Pages.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const COVERAGE_DIR = resolve(import.meta.dirname, '../coverage')
const COLORS = [
  [90, 'brightgreen'],
  [80, 'green'],
  [70, 'yellowgreen'],
  [60, 'yellow'],
  [50, 'orange'],
  [0, 'red']
]

const summary = JSON.parse(readFileSync(join(COVERAGE_DIR, 'coverage-summary.json'), 'utf8'))
const { pct } = summary.total.lines
const [, color] = COLORS.find(([min]) => pct >= min)

writeFileSync(join(COVERAGE_DIR, 'badge.json'), JSON.stringify({ schemaVersion: 1, label: 'coverage', message: `${pct}%`, color }))
console.log(`Line coverage: ${pct}%`)
