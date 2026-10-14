import type { DrawableShape } from '../../src/index'

/** Logical size of the measured canvas */
export const CANVAS_WIDTH = 1000
export const CANVAS_HEIGHT = 600

/** The shapes fill this area: the band below it stays empty, to start a selection frame */
export const SHAPES_AREA = { width: 1000, height: 500 }

const STYLE = { fillColor: '#4a90d9', strokeColor: '#000000', lineWidth: 1, opacity: 100, lineDash: 0, lineArrow: 0, closedPoints: 0 }

/** Generates `count` rectangles laid out on a grid, always the same for a given count */
export const generateShapes = (count: number): DrawableShape[] => {
  const columns = Math.ceil(Math.sqrt((count * SHAPES_AREA.width) / SHAPES_AREA.height))
  const rows = Math.ceil(count / columns)
  const cellWidth = SHAPES_AREA.width / columns
  const cellHeight = SHAPES_AREA.height / rows

  return Array.from({ length: count }, (_, index) => ({
    type: 'rect',
    x: Math.round((index % columns) * cellWidth + cellWidth * 0.15),
    y: Math.round(Math.floor(index / columns) * cellHeight + cellHeight * 0.15),
    width: Math.round(cellWidth * 0.7),
    height: Math.round(cellHeight * 0.7),
    rotation: 0,
    style: STYLE
  }))
}

/** Center of a generated shape, in canvas coordinates */
export const getShapeCenter = (shape: DrawableShape): [number, number] => {
  if (shape.type !== 'rect') throw new Error('Only rectangles are generated')
  return [shape.x + shape.width / 2, shape.y + shape.height / 2]
}
