import { type CSSProperties, Fragment, useId, useState } from 'react'
import referenceData from '../../assets/perf-reference.json'

// The reference figures of the Performance page, measured by `pnpm bench:reference` (see tests/perf/README.md)

type ConditionId = 'cpu1-dpr1' | 'cpu4-dpr1' | 'cpu1-dpr2' | 'cpu4-dpr2' | 'software-dpr1' | 'software-dpr2'
/** A metric by number of shapes, like { "100": 4.5, "500": 6.6 }: a size missing was not measured */
type BySize = Record<string, number>
type Figures = {
  date: string
  /** By gesture, the largest drawing whose frames keep each frame rate, the smaller ones too: null below the smallest one */
  capacity: Record<string, { fps60: number | null; fps30: number | null }>
  /** By gesture: the work of a frame, p95, in ms */
  frameWorkP95: Record<string, BySize>
  /** By gesture: the interval between two frames, p95, in ms */
  frameIntervalP95: Record<string, BySize>
  /** By operation: its duration, in ms */
  operationMs: Record<string, BySize>
}
type Reference = {
  /** The library measured, like v1.0.0-beta.4-22-gbc4a09c: the last tag, the commits since, the commit */
  library: string
  /** The GPU drawing the canvases, except in the conditions of the software rendering */
  machine: { cpu: string; threads: number; memoryGb: number; os: string; gpu: string }
  /** Like HeadlessChrome/156.0.8078.4 */
  browser: string
  conditions: Record<ConditionId, Figures>
}

const reference = referenceData as Reference

const CONDITIONS: Record<ConditionId, string> = {
  'cpu1-dpr1': 'CPU 1×, density 1',
  'cpu4-dpr1': 'CPU 4× slower, density 1',
  'cpu1-dpr2': 'CPU 1×, density 2',
  'cpu4-dpr2': 'CPU 4× slower, density 2',
  'software-dpr1': 'Software rendering, density 1',
  'software-dpr2': 'Software rendering, density 2'
}
const CONDITION_IDS = Object.keys(CONDITIONS) as ConditionId[]
/** The conditions of the capacity table, drawn by the GPU: the software rendering is chosen above the other tables */
const GPU_CONDITION_IDS: ConditionId[] = ['cpu1-dpr1', 'cpu4-dpr1', 'cpu1-dpr2', 'cpu4-dpr2']

/** The gestures of the tables, measured in each condition */
const GESTURES: Record<string, string> = {
  hover: 'Hover the shapes',
  translate: 'Drag a shape',
  'translate-all': 'Drag all the shapes',
  pan: 'Pan',
  zoom: 'Zoom',
  brush: 'Draw a brush stroke',
  mixed: 'Drag a shape among shapes of all types',
  opacity: 'Drag a shape among semi-transparent shapes'
}

const OPERATIONS: Record<string, string> = {
  load: 'Load the drawing',
  'export-data': 'Export the data',
  'export-image': 'Export the image'
}

/** Every size measured: the operations are measured on each one */
const getSizes = (figures: Figures) => Object.keys(figures.operationMs.load ?? {}).map(Number)

const formatCount = (count: number) => count.toLocaleString('en')
const formatMs = (duration: number) => `${duration.toLocaleString('en', { maximumFractionDigits: 1 })} ms`

/** A capacity in shapes: "≥ 20,000" at the top of the climb, "< 100" below its bottom, "–" for a gesture not measured */
const formatCapacity = (figures: Figures, sizes: number[], gesture: string, fps: 'fps60' | 'fps30') => {
  const capacity = figures.capacity[gesture]?.[fps]
  if (capacity === undefined) return '–'
  if (capacity === null) return `< ${formatCount(sizes[0]!)}`
  return capacity === sizes[sizes.length - 1] ? `≥ ${formatCount(capacity)}` : formatCount(capacity)
}

const numberStyle: CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' }
const labelStyle: CSSProperties = { textAlign: 'left' }

/** Where and when the figures were measured */
export const ReferenceConditions = () => {
  const { library, machine, browser, conditions } = reference
  const [, headless, version] = browser.match(/(Headless)?Chrome\/(\d+)/) ?? []
  const date = new Date(conditions['cpu1-dpr1'].date).toLocaleDateString('en', { dateStyle: 'long' })
  return (
    <p>
      Measured on {date} with {headless ? 'headless ' : ''}Chromium {version} and the production build of React, on a {machine.cpu} ({machine.threads}{' '}
      threads, {machine.memoryGb} GB, {machine.gpu}, {machine.os}). Library: <code>{library}</code>.
    </p>
  )
}

/** The capacity of each gesture in each condition, at 60 and 30 fps */
export const CapacityTable = () => {
  const columns = GPU_CONDITION_IDS.map(id => {
    const figures = reference.conditions[id]
    return { id, figures, sizes: getSizes(figures) }
  })
  return (
    <table>
      <thead>
        <tr>
          <th rowSpan={2}>Gesture</th>
          {columns.map(({ id }) => (
            <th key={id} colSpan={2}>
              {CONDITIONS[id]}
            </th>
          ))}
        </tr>
        <tr>
          {columns.map(({ id }) => (
            <Fragment key={id}>
              <th>60 fps</th>
              <th>30 fps</th>
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(GESTURES).map(([gesture, label]) => (
          <tr key={gesture}>
            <th scope='row' style={labelStyle}>
              {label}
            </th>
            {columns.map(({ id, figures, sizes }) => (
              <Fragment key={id}>
                <td style={numberStyle}>{formatCapacity(figures, sizes, gesture, 'fps60')}</td>
                <td style={numberStyle}>{formatCapacity(figures, sizes, gesture, 'fps30')}</td>
              </Fragment>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** A table with a row per item and a column per number of shapes, in the conditions chosen above it */
type SizeField = 'frameWorkP95' | 'frameIntervalP95' | 'operationMs'

const SizeTable = ({ items, firstColumn, field }: { items: Record<string, string>; firstColumn: string; field: SizeField }) => {
  const [condition, setCondition] = useState<ConditionId>('cpu1-dpr1')
  const selectId = useId()
  const figures = reference.conditions[condition]
  const sizes = getSizes(figures)
  return (
    <>
      <p>
        <label htmlFor={selectId}>Conditions</label>{' '}
        <select id={selectId} value={condition} onChange={event => setCondition(event.target.value as ConditionId)}>
          {CONDITION_IDS.map(id => (
            <option key={id} value={id}>
              {CONDITIONS[id]}
            </option>
          ))}
        </select>
      </p>
      <table>
        <thead>
          <tr>
            <th>{firstColumn}</th>
            {sizes.map(size => (
              <th key={size} style={numberStyle}>
                {formatCount(size)} shapes
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(items).map(([item, label]) => (
            <tr key={item}>
              <th scope='row' style={labelStyle}>
                {label}
              </th>
              {sizes.map(size => {
                const value = figures[field][item]?.[size]
                return (
                  <td key={size} style={numberStyle}>
                    {value === undefined ? '–' : formatMs(value)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** The work of a frame of each gesture, p95, by number of shapes: "–" once the frames of a smaller drawing took over 50 ms */
export const FrameWorkTable = () => <SizeTable items={GESTURES} firstColumn='Gesture' field='frameWorkP95' />

/** The interval between two frames of each gesture, p95, by number of shapes */
export const FrameIntervalTable = () => <SizeTable items={GESTURES} firstColumn='Gesture' field='frameIntervalP95' />

/** The duration of each operation, by number of shapes */
export const OperationsTable = () => <SizeTable items={OPERATIONS} firstColumn='Operation' field='operationMs' />

/**
 * The figures of a gesture in a condition. A gesture which was not measured in it, like a scenario of the tips out of the
 * first condition, fails the page: a sentence would give a figure which does not exist
 */
const getGestureFigures = (gesture: string, condition: ConditionId) => {
  const figures = reference.conditions[condition]
  if (!figures.capacity[gesture]) throw new Error(`The gesture ${gesture} was not measured in the condition ${condition}`)
  return figures
}

/** The capacity of a gesture at 60 fps, in a sentence: a number of shapes */
export const CapacityOf = ({ gesture, condition = 'cpu1-dpr1' }: { gesture: string; condition?: ConditionId }) => {
  const figures = getGestureFigures(gesture, condition)
  return formatCapacity(figures, getSizes(figures), gesture, 'fps60')
}

/** The work of a frame of a gesture, p95, at a number of shapes, in a sentence */
export const FrameWorkOf = ({ gesture, shapes, condition = 'cpu1-dpr1' }: { gesture: string; shapes: number; condition?: ConditionId }) => {
  const figures = getGestureFigures(gesture, condition)
  if (!getSizes(figures).includes(shapes)) throw new Error(`No drawing of ${shapes} shapes was measured`)
  const value = figures.frameWorkP95[gesture]![shapes]
  // a gesture is not measured on the drawings larger than one whose frames took over 50 ms
  return value === undefined ? 'over 50 ms' : formatMs(value)
}
