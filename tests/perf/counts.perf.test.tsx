// Checks the counts of each scenario against counts-baseline.json, from a single run: unlike the times, they do not
// depend on the speed of the machine. Run by `pnpm bench:counts` and by the CI on each pull request (see README.md)

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { commands } from 'vitest/browser'
import { COUNT_NAMES, type CountName, type Counts, pickCounts } from './metrics'
import { type Comparison, compareSamples, formatJson, listSignificant } from './report'
import { checkCriteria, endRuns, getResultKey, prepareRuns, REACT_BUILD, runOnce, selectScenarios } from './run'
import { SCENARIOS } from './scenarios'

const MEASURED_SCENARIOS = selectScenarios(SCENARIOS)
const BASELINE_PATH = 'tests/perf/counts-baseline.json'
/** The counts measured, in the format of the baseline: the CI publishes them */
const RESULTS_PATH = 'tests/perf/results/counts.json'
/** The sizes and the events of the baseline, whatever the variables of the benchmark */
const SIZES = [50, 500]
const EVENTS_PER_FRAME = 1
/** `pnpm bench:counts -u` writes the counts measured to the baseline instead of checking them */
const UPDATE = inject('perfUpdate')
const UPDATE_COMMAND = 'pnpm bench:counts -u'

type CountsByResult = Record<string, Counts>

let baseline: CountsByResult = {}
const results: CountsByResult = {}
/** The counts lower than the baseline: they do not fail, but the baseline should be lowered to keep catching them */
const drops: string[] = []

/** The counts of a result which differ from the baseline, as "key name: baseline → measured (+gap ▲)", but the variable ones */
const compareCounts = (key: string, expected: Partial<Counts>, counts: Counts, variableCounts: CountName[] = []) => {
  const names = COUNT_NAMES.filter(name => !variableCounts.includes(name))
  const missing = names.filter(name => expected[name] === undefined)
  const comparisons: Partial<Record<string, Comparison>> = Object.fromEntries(
    names.filter(name => expected[name] !== undefined).map(name => [name, compareSamples([expected[name]!], [counts[name]])])
  )
  const list = (verdict: Comparison['verdict']) =>
    listSignificant({ [key]: Object.fromEntries(Object.entries(comparisons).filter(([, comparison]) => comparison!.verdict === verdict)) })
  return { rises: [...missing.map(name => `${key} ${name}: not in the baseline`), ...list('worse')], drops: list('better') }
}

beforeAll(async () => {
  // the counts of the brush differ with the development build of React, and the baseline holds a single set of counts
  if (REACT_BUILD !== 'production' || window.devicePixelRatio !== 1)
    throw new Error('The counts are measured with the production build of React and a pixel ratio of 1: unset PERF_REACT and PERF_DPR')
  await prepareRuns()
  try {
    baseline = JSON.parse(await commands.readFile(BASELINE_PATH)) as CountsByResult
  } catch {
    // every result fails, with the command which writes the baseline
  }
})

afterAll(async () => {
  await endRuns()
  if (!Object.keys(results).length) return
  await commands.writeFile(RESULTS_PATH, formatJson(results))
  // the order of the scenarios, then of the sizes
  const keys = SCENARIOS.flatMap(scenario => SIZES.map(size => getResultKey(scenario, size)))
  if (UPDATE) {
    // the results not measured this time are kept, the ones of the removed scenarios are dropped
    const updated = Object.fromEntries(keys.map(key => [key, results[key] ?? baseline[key]]).filter(([, counts]) => counts))
    await commands.writeFile(BASELINE_PATH, formatJson(updated))
    console.log(`${BASELINE_PATH} updated with ${Object.keys(results).length} results`)
    return
  }
  const messages = [
    drops.length
      ? `Counts lower than ${BASELINE_PATH}: run ${UPDATE_COMMAND} to lower it\n${drops.join('\n')}`
      : `No count lower than ${BASELINE_PATH}`
  ]
  const removed = Object.keys(baseline).filter(key => !keys.includes(key))
  if (removed.length) messages.push(`Results of ${BASELINE_PATH} which no longer exist: run ${UPDATE_COMMAND} to remove them\n${removed.join('\n')}`)
  console.log(messages.join('\n\n'))
})

describe('counts', () => {
  for (const scenario of MEASURED_SCENARIOS) {
    for (const size of SIZES) {
      it(`${scenario.id} with ${size} shapes`, async () => {
        const key = getResultKey(scenario, size)
        const metrics = await runOnce(scenario, size, EVENTS_PER_FRAME)
        const counts = pickCounts(metrics)
        results[key] = counts
        checkCriteria(metrics, scenario.criteria)
        // compared in the run, also by -u, which would take a change of these counts in the baseline
        const twinCounts = scenario.sameCountsAs && results[getResultKey({ id: scenario.sameCountsAs }, size)]
        if (twinCounts) {
          const names = COUNT_NAMES.filter(name => !scenario.variableCounts?.includes(name))
          const pick = (all: Counts) => Object.fromEntries(names.map(name => [name, all[name]]))
          expect(pick(counts), `counts of ${scenario.sameCountsAs}, measured in this run`).toEqual(pick(twinCounts))
        }
        if (UPDATE) return

        const expected = baseline[key]
        if (!expected) throw new Error(`${key} is not in ${BASELINE_PATH}: run ${UPDATE_COMMAND}`)
        const changes = compareCounts(key, expected, counts, scenario.variableCounts)
        drops.push(...changes.drops)
        expect(changes.rises, `counts higher than ${BASELINE_PATH}: fix them, or run ${UPDATE_COMMAND} if they are expected`).toEqual([])
      })
    }
  }
})
