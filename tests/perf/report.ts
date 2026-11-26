// Statistics and text tables of the reports of the benchmark. Also imported by scripts/bench-compare.mjs, which Node runs
// by stripping the types: this file imports nothing and holds only erasable TypeScript (no enum, no namespace, no
// parameter property).

/** Below it, a difference between two series of times is unlikely to be the noise of the runs */
export const SIGNIFICANCE = 0.05

/**
 * Below it, a gap of the medians of two series of times, in %, is not marked even when significant: it does not matter,
 * and the duration of a gesture, which hardly varies, would show its few milliseconds of drift
 */
export const MIN_GAP = 2

/** Quantile of ascending values, interpolated between the two closest ones */
const quantile = (sorted: number[], ratio: number): number => {
  if (!sorted.length) return 0
  const position = (sorted.length - 1) * ratio
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower)
}

export type Summary = { median: number; p25: number; p75: number }

export const summarize = (values: number[]): Summary => {
  const sorted = [...values].sort((a, b) => a - b)
  return { median: quantile(sorted, 0.5), p25: quantile(sorted, 0.25), p75: quantile(sorted, 0.75) }
}

export const median = (values: number[]): number => summarize(values).median

/** Rounds to 2 decimals, for the reports */
export const round = (value: number) => Math.round(value * 100) / 100

/** Rounds to 3 significant digits, for the times of the micro-benchmarks: from a few microseconds to tens of milliseconds */
export const roundSignificant = (value: number) => Number(value.toPrecision(3))

/** Gap from base to next, in % of base: its sign is the one of the gap */
const getRelativeGap = (base: number, next: number) => {
  const gap = next - base
  return base ? (gap / base) * 100 : gap ? Number.POSITIVE_INFINITY : 0
}

/** Arrangements of `left` and `right` values which give the statistic `value`: they do not depend on the values compared */
const arrangementCounts = new Map<string, number>()

const countArrangements = (value: number, left: number, right: number): number => {
  if (value < 0) return 0
  if (!left || !right) return value === 0 ? 1 : 0
  const key = `${value},${left},${right}`
  let result = arrangementCounts.get(key)
  if (result === undefined) {
    result = countArrangements(value - right, left - 1, right) + countArrangements(value, left, right - 1)
    arrangementCounts.set(key, result)
  }
  return result
}

/**
 * Two-sided p-value of the Mann-Whitney U test: how likely the ranks of the two series are this far apart if they came
 * from the same distribution. It assumes nothing on how the times spread, and suits a few samples per series. Exact:
 * it counts the arrangements of the ranks. Ties share their mean rank. With 5 samples per series, it is 0.0079 at least
 */
export const mannWhitneyP = (a: number[], b: number[]): number => {
  const m = a.length
  const n = b.length
  if (!m || !n) return 1
  const ranked = [...a.map(value => ({ value, inA: true })), ...b.map(value => ({ value, inA: false }))].sort((x, y) => x.value - y.value)
  let rankSumA = 0
  for (let start = 0; start < ranked.length; ) {
    let end = start
    while (end + 1 < ranked.length && ranked[end + 1]!.value === ranked[start]!.value) end++
    // ranks start + 1 to end + 1, shared
    const rank = (start + end + 2) / 2
    for (let index = start; index <= end; index++) if (ranked[index]!.inA) rankSumA += rank
    start = end + 1
  }
  const uA = rankSumA - (m * (m + 1)) / 2
  const u = Math.floor(Math.min(uA, m * n - uA))
  let atMost = 0
  for (let value = 0; value <= u; value++) atMost += countArrangements(value, m, n)
  let arrangements = 1
  for (let index = 1; index <= m; index++) arrangements = (arrangements * (n + index)) / index
  return Math.min(1, (2 * atMost) / arrangements)
}

export type Comparison = {
  base: Summary
  next: Summary
  /** Gap of the medians, in % of the base: its sign is the one of the gap */
  diff: number
  /** p-value of the Mann-Whitney U test, or of the adjusted one after adjustComparisons. 0 or 1 for the counts */
  p: number
  /** Both series hold a single value, like the counts: no test is needed to compare them */
  constant: boolean
  /** Every metric is better lower. 'unchanged' when the gap may be noise */
  verdict: 'worse' | 'better' | 'unchanged'
}

/** A count which changes is a gap. A time differs when the test says so, by MIN_GAP at least */
const getVerdict = (diff: number, p: number, constant: boolean): Comparison['verdict'] => {
  if (!diff || p >= SIGNIFICANCE || (!constant && Math.abs(diff) < MIN_GAP)) return 'unchanged'
  return diff > 0 ? 'worse' : 'better'
}

/** Compares two series of a metric. Counts do not vary from run to run: when both series are constant, no test is needed */
export const compareSamples = (base: number[], next: number[]): Comparison => {
  const baseSummary = summarize(base)
  const nextSummary = summarize(next)
  const isConstant = (values: number[]) => values.every(value => value === values[0])
  const constant = isConstant(base) && isConstant(next)
  const p = constant ? (nextSummary.median === baseSummary.median ? 1 : 0) : mannWhitneyP(base, next)
  const diff = getRelativeGap(baseSummary.median, nextSummary.median)
  return { base: baseSummary, next: nextSummary, diff, p, constant, verdict: getVerdict(diff, p, constant) }
}

/** The comparison of each metric, by "scenario@shapes" */
export type ComparisonsByResult = Record<string, Partial<Record<string, Comparison>> | undefined>

/**
 * Adjusts the p-values of the times compared in a report for their number, by the Benjamini-Hochberg procedure, and
 * draws the verdicts again from them: among hundreds of times compared, 5 % would pass p < 0.05 by chance. The counts,
 * compared without test, keep theirs. With 5 samples per series, no time can pass it among more than 6
 */
export const adjustComparisons = (comparisons: ComparisonsByResult): ComparisonsByResult => {
  const tested = Object.values(comparisons)
    .flatMap(metrics => Object.values(metrics ?? {}))
    .filter((comparison): comparison is Comparison => !!comparison && !comparison.constant)
    .sort((a, b) => a.p - b.p)
  const adjusted = new Map<Comparison, number>()
  let lowest = 1
  for (let rank = tested.length; rank > 0; rank--) {
    const comparison = tested[rank - 1]!
    lowest = Math.min(lowest, (comparison.p * tested.length) / rank)
    adjusted.set(comparison, lowest)
  }
  const adjust = (comparison: Comparison): Comparison => {
    const p = adjusted.get(comparison)
    return p === undefined ? comparison : { ...comparison, p, verdict: getVerdict(comparison.diff, p, comparison.constant) }
  }
  return Object.fromEntries(
    Object.entries(comparisons).map(([key, metrics]) => [
      key,
      metrics && Object.fromEntries(Object.entries(metrics).map(([metric, comparison]) => [metric, comparison && adjust(comparison)]))
    ])
  )
}

const withSign = (value: number) => `${value > 0 ? '+' : ''}${value}`

/** A gap in % of the base, then its marker if any. A base of 0 gives `(new)` */
const formatPercent = (diff: number, marker = '') => (Number.isFinite(diff) ? `(${withSign(Math.round(diff))}%${marker})` : `(new${marker})`)

/**
 * The gap to the base for a table: `(+12% ▲)` when significantly worse, `(-8% ▼)` when better, `(+3%)` when it may be
 * noise. A count shows its own gap, like `(+300 ▲)`: even a small one matters
 */
export const formatComparison = ({ base, next, diff, constant, verdict }: Comparison): string => {
  if (base.median === next.median) return '(=)'
  const marker = verdict === 'worse' ? ' ▲' : verdict === 'better' ? ' ▼' : ''
  if (constant) return `(${withSign(round(next.median - base.median))}${marker})`
  return formatPercent(diff, marker)
}

/**
 * The gap of a time to the one of another run, in %, never marked, like `(+3%)`: two runs made at different times differ
 * by the drift of the machine, which neither shows. Only the alternated rounds of pnpm bench:compare tell a gap from noise
 */
export const formatTimeGap = (base: number, next: number) => (base === next ? '(=)' : formatPercent(getRelativeGap(base, next)))

/** How to read the markers of formatComparison, once the comparisons are adjusted */
export const COMPARISON_LEGEND = `▲ worse, ▼ better: significant gaps (Mann-Whitney U test, p < ${SIGNIFICANCE} once adjusted for the number of times compared, and ${MIN_GAP} % at least for the times). The other gaps may be noise`

/** The gaps unlikely to be noise, one per line, from the comparisons of each metric by result, their values rounded by format */
export const listSignificant = (comparisons: ComparisonsByResult, format = round): string[] =>
  Object.entries(comparisons).flatMap(([key, metrics]) =>
    Object.entries(metrics ?? {})
      .filter(([, comparison]) => comparison!.verdict !== 'unchanged')
      .map(
        ([metric, comparison]) =>
          `${key} ${metric}: ${format(comparison!.base.median)} → ${format(comparison!.next.median)} ${formatComparison(comparison!)}`
      )
  )

/** A report or a baseline, as written to disk */
export const formatJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

/** Text table under its title: the first row is the header */
export const formatTextTable = (title: string, rows: string[][]): string => {
  const widths = rows[0]!.map((_, column) => Math.max(...rows.map(row => row[column]!.length)))
  const lines = rows.map(row => row.map((cell, column) => cell.padEnd(widths[column]!)).join(' │ '))
  return [`── ${title} ──`, lines[0], widths.map(width => '─'.repeat(width)).join('─┼─'), ...lines.slice(1)].join('\n')
}
