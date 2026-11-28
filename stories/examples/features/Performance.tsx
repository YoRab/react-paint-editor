import { useId, useState } from 'react'
import { Canvas, Editor, type Point, type ShapeInput, useReactPaint } from '../../../src/index'
import '../buttons.css'
import { PerformancePanel } from './PerformancePanel'
import { replayBrush, replayDrag, replayPan, replayZoom } from './replayGestures'

const WIDTH = 1000
const HEIGHT = 600
const CENTER: Point = [WIDTH / 2, HEIGHT / 2]
const COUNTS = [1000, 2000, 5000, 10000, 20000]
const COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#8338ec', '#ffbe0b']
/** The types of the shapes of all the types, drawn in turn */
const ALL_TYPES = ['rect', 'ellipse', 'circle', 'line', 'polygon', 'curve', 'text', 'brush'] as const
/** One shape out of this number is a photo in the mix with photos */
const PHOTO_FREQUENCY = 50
/** The shapes of a group, when they are grouped: the numbers of shapes are multiples of it */
const GROUP_SIZE = 10

type ShapeType = (typeof ALL_TYPES)[number] | 'picture'

/** The mixes of shapes, and the types they draw in turn */
const MIXES = {
  all: { label: 'All types', types: ALL_TYPES },
  rect: { label: 'Rectangles', types: ['rect'] },
  brush: { label: 'Brushes', types: ['brush'] },
  text: { label: 'Texts', types: ['text'] },
  photos: { label: 'All types with photos', types: ALL_TYPES }
} satisfies Record<string, { label: string; types: readonly ShapeType[] }>

type Mix = keyof typeof MIXES
type Drawing = { count: number; mix: Mix; isTransparent: boolean; isGrouped: boolean }
type Cell = { x: number; y: number; width: number; height: number }

const INITIAL_DRAWING: Drawing = { count: 2000, mix: 'all', isTransparent: false, isGrouped: false }

const getType = (index: number, mix: Mix): ShapeType => {
  if (mix === 'photos' && index % PHOTO_FREQUENCY === 0) return 'picture'
  const { types } = MIXES[mix]
  return types[index % types.length]!
}

let photo: string | undefined

/** A photo drawn once, as a JPEG data URL shared by the pictures of the drawing */
const getPhoto = () => {
  if (!photo) {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 160
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#a8dadc')
    gradient.addColorStop(1, '#1d3557')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const [index, color] of COLORS.entries()) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(30 + index * 36, 80 + Math.sin(index) * 40, 24, 0, Math.PI * 2)
      ctx.fill()
    }
    photo = canvas.toDataURL('image/jpeg', 0.8)
  }
  return photo
}

/** A shape of a type, drawn in its cell of the grid */
const createShape = (type: ShapeType, index: number, { x, y, width, height }: Cell, opacity: number): ShapeInput => {
  const color = COLORS[index % COLORS.length]!
  const style = { fillColor: color, strokeColor: '#1d3557', lineWidth: 1, opacity }
  switch (type) {
    case 'rect':
      return { type: 'rect', x, y, width, height, style }
    case 'picture':
      return { type: 'picture', x, y, width, height, src: getPhoto(), style: { opacity } }
    case 'ellipse':
      return { type: 'ellipse', x: x + width / 2, y: y + height / 2, radiusX: width / 2, radiusY: height / 2, style }
    case 'circle':
      return { type: 'circle', x: x + width / 2, y: y + height / 2, radius: Math.min(width, height) / 2, style }
    case 'line':
      return {
        type: 'line',
        points: [
          [x, y + height],
          [x + width, y]
        ],
        style
      }
    case 'polygon':
      return {
        type: 'polygon',
        points: [
          [x + width / 2, y],
          [x + width, y + height],
          [x, y + height]
        ],
        style: { ...style, closedPoints: 1 }
      }
    case 'curve':
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
    case 'text':
      return { type: 'text', x, y, value: ['Text'], fontSize: height / 2, style: { strokeColor: color, opacity } }
    case 'brush':
      return {
        type: 'brush',
        points: [Array.from({ length: 12 }, (_, step): Point => [x + (width * step) / 11, y + height / 2 + (Math.sin(step) * height) / 2])],
        style: { strokeColor: color, lineWidth: 1, opacity }
      }
  }
}

/** The grid of `count` cells which fills the drawing, from left to right, then from top to bottom */
const getGrid = (count: number) => {
  const columns = Math.ceil(Math.sqrt((count * WIDTH) / HEIGHT))
  const rows = Math.ceil(count / columns)
  const cellWidth = WIDTH / columns
  const cellHeight = HEIGHT / rows
  return {
    centerIndex: Math.floor(rows / 2) * columns + Math.floor(columns / 2),
    /** A cell, whose shape takes 80 % */
    getCell: (index: number): Cell => ({
      x: (index % columns) * cellWidth + cellWidth * 0.1,
      y: Math.floor(index / columns) * cellHeight + cellHeight * 0.1,
      width: cellWidth * 0.8,
      height: cellHeight * 0.8
    })
  }
}

/** The shapes of the drawing: always the same ones for the same choices */
const generateShapes = ({ count, mix, isTransparent, isGrouped }: Drawing): ShapeInput[] => {
  const { getCell } = getGrid(count)
  const shapes = Array.from({ length: count }, (_, index) => createShape(getType(index, mix), index, getCell(index), isTransparent ? 50 : 100))
  if (!isGrouped) return shapes
  return Array.from(
    { length: count / GROUP_SIZE },
    (_, index): ShapeInput => ({
      type: 'group',
      shapes: shapes.slice(index * GROUP_SIZE, (index + 1) * GROUP_SIZE)
    })
  )
}

/** A point of a shape, where a press grabs it: in its fill, on its line or in its first letter */
const getGrabPoint = (shape: ShapeInput): Point => {
  switch (shape.type) {
    case 'rect':
    case 'picture':
      return [shape.x + shape.width / 2, shape.y + shape.height / 2]
    case 'ellipse':
    case 'circle':
      return [shape.x, shape.y]
    case 'polygon':
    case 'line': {
      // the middle of its points: inside a triangle, on a line
      const [x, y] = shape.points.reduce(([sumX, sumY], [pointX, pointY]) => [sumX + pointX, sumY + pointY], [0, 0])
      return [x / shape.points.length, y / shape.points.length]
    }
    // the start of its line: a curve is not filled
    case 'curve':
      return shape.points[0]!
    case 'brush':
      return shape.points[0]![0]!
    case 'text': {
      const fontSize = shape.fontSize ?? 0
      return [shape.x + fontSize / 2, shape.y + fontSize / 2]
    }
    default:
      throw new Error(`The drawing has no ${shape.type}`)
  }
}

/** The point where the replayed drag grabs the shape in the middle of the drawing */
const getCentralGrabPoint = ({ count, mix }: Drawing) => {
  const { centerIndex, getCell } = getGrid(count)
  return getGrabPoint(createShape(getType(centerIndex, mix), centerIndex, getCell(centerIndex), 100))
}

/** The editor with thousands of shapes, the panel of its performance, and the gestures it replays */
export const Performance = () => {
  const [drawing, setDrawing] = useState(INITIAL_DRAWING)
  const [maxPixelRatio, setMaxPixelRatio] = useState(2)
  const [isReplaying, setIsReplaying] = useState(false)
  const [shapes] = useState(() => generateShapes(INITIAL_DRAWING))
  // an infinite drawing, which the replayed pan scrolls
  const paint = useReactPaint({ shapes, options: { size: 'infinite' } })
  const mixId = useId()
  const pixelRatioId = useId()

  const changeDrawing = (changes: Partial<Drawing>) => {
    const newDrawing = { ...drawing, ...changes }
    setDrawing(newDrawing)
    void paint.actions.loadData({ shapes: generateShapes(newDrawing) })
  }

  const replay = async (play: () => Promise<void>) => {
    setIsReplaying(true)
    try {
      await play()
    } finally {
      setIsReplaying(false)
    }
  }

  const replays: [label: string, play: () => Promise<void>][] = [
    ['Replay a drag', () => replayDrag(paint, getCentralGrabPoint(drawing))],
    ['Replay a pan', () => replayPan(paint, CENTER)],
    ['Replay a zoom', () => replayZoom(paint, CENTER)],
    ['Replay a brush stroke', () => replayBrush(paint, [100, HEIGHT / 2], [WIDTH - 100, HEIGHT / 2])]
  ]

  return (
    // the panel takes the width of the editor
    <div style={{ maxWidth: WIDTH }}>
      {/* a change of the drawing during a replay would be measured with it */}
      <fieldset disabled={isReplaying} style={{ margin: 0, padding: 0, border: 0 }}>
        <div className='example-buttons'>
          {COUNTS.map(count => (
            <button
              key={count}
              type='button'
              className={`example-button ${drawing.count === count ? 'active' : ''}`}
              aria-pressed={drawing.count === count}
              onClick={() => changeDrawing({ count })}
            >
              {count.toLocaleString('en')} shapes
            </button>
          ))}
        </div>
        <div className='example-buttons'>
          <span className='example-title'>
            <label htmlFor={mixId}>Shapes</label>{' '}
            <select id={mixId} value={drawing.mix} onChange={event => changeDrawing({ mix: event.target.value as Mix })}>
              {Object.entries(MIXES).map(([mix, { label }]) => (
                <option key={mix} value={mix}>
                  {label}
                </option>
              ))}
            </select>
          </span>
          <label className='example-title'>
            <input type='checkbox' checked={drawing.isTransparent} onChange={event => changeDrawing({ isTransparent: event.target.checked })} /> 50 %
            opacity
          </label>
          <label className='example-title'>
            <input type='checkbox' checked={drawing.isGrouped} onChange={event => changeDrawing({ isGrouped: event.target.checked })} /> Groups of{' '}
            {GROUP_SIZE}
          </label>
          <span className='example-title'>
            <label htmlFor={pixelRatioId}>Max density</label>{' '}
            <select id={pixelRatioId} value={maxPixelRatio} onChange={event => setMaxPixelRatio(Number(event.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </span>
        </div>
        <div className='example-buttons'>
          {replays.map(([label, play]) => (
            <button key={label} type='button' className='example-button' onClick={() => void replay(play)}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <PerformancePanel paint={paint} />
      <Editor paint={paint}>
        <Canvas paint={paint} options={{ canvasMaxPixelRatio: maxPixelRatio }} />
      </Editor>
    </div>
  )
}
