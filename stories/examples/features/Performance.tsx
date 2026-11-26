import { useState } from 'react'
import { Canvas, Editor, type Point, type ShapeInput, useReactPaint } from '../../../src/index'
import '../buttons.css'
import { PerformancePanel } from './PerformancePanel'

const WIDTH = 1000
const HEIGHT = 600
const COUNTS = [1000, 2000, 5000, 10000]
const INITIAL_COUNT = 2000
const COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#8338ec', '#ffbe0b']

type Cell = { x: number; y: number; width: number; height: number }

/** A shape of each type in turn, drawn in its cell of the grid */
const createShape = (index: number, { x, y, width, height }: Cell): ShapeInput => {
  const color = COLORS[index % COLORS.length]!
  const style = { fillColor: color, strokeColor: '#1d3557', lineWidth: 1 }
  switch (index % 8) {
    case 0:
      return { type: 'rect', x, y, width, height, style }
    case 1:
      return { type: 'ellipse', x: x + width / 2, y: y + height / 2, radiusX: width / 2, radiusY: height / 2, style }
    case 2:
      return { type: 'circle', x: x + width / 2, y: y + height / 2, radius: Math.min(width, height) / 2, style }
    case 3:
      return {
        type: 'line',
        points: [
          [x, y + height],
          [x + width, y]
        ],
        style
      }
    case 4:
      return {
        type: 'polygon',
        points: [
          [x + width / 2, y],
          [x + width, y + height],
          [x, y + height]
        ],
        style: { ...style, closedPoints: 1 }
      }
    case 5:
      return {
        type: 'curve',
        points: [
          [x, y + height],
          [x + width / 3, y],
          [x + (width * 2) / 3, y + height],
          [x + width, y]
        ],
        style: { ...style, fillColor: 'transparent' }
      }
    case 6:
      return { type: 'text', x, y, value: ['Text'], fontSize: height / 2, style: { strokeColor: color } }
    default:
      return {
        type: 'brush',
        points: [Array.from({ length: 12 }, (_, step): Point => [x + (width * step) / 11, y + height / 2 + (Math.sin(step) * height) / 2])],
        style: { strokeColor: color, lineWidth: 1 }
      }
  }
}

/** `count` shapes of all the types, laid out on a grid which fills the drawing: always the same ones for a count */
const generateShapes = (count: number): ShapeInput[] => {
  const columns = Math.ceil(Math.sqrt((count * WIDTH) / HEIGHT))
  const rows = Math.ceil(count / columns)
  const cellWidth = WIDTH / columns
  const cellHeight = HEIGHT / rows
  return Array.from({ length: count }, (_, index) =>
    createShape(index, {
      x: (index % columns) * cellWidth + cellWidth * 0.1,
      y: Math.floor(index / columns) * cellHeight + cellHeight * 0.1,
      width: cellWidth * 0.8,
      height: cellHeight * 0.8
    })
  )
}

/** The editor with thousands of shapes, whose number is chosen with the buttons */
export const Performance = () => {
  const [count, setCount] = useState(INITIAL_COUNT)
  const [shapes] = useState(() => generateShapes(INITIAL_COUNT))
  const paint = useReactPaint({ shapes, options: { canZoom: 'always' } })

  const chooseCount = (newCount: number) => {
    setCount(newCount)
    void paint.actions.loadData({ shapes: generateShapes(newCount) })
  }

  return (
    // the panel takes the width of the editor
    <div style={{ maxWidth: WIDTH }}>
      <div className='example-buttons'>
        {COUNTS.map(choice => (
          <button
            key={choice}
            type='button'
            className={`example-button ${count === choice ? 'active' : ''}`}
            aria-pressed={count === choice}
            onClick={() => chooseCount(choice)}
          >
            {choice.toLocaleString('en')} shapes
          </button>
        ))}
      </div>
      <PerformancePanel paint={paint} />
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </div>
  )
}
