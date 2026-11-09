import { Canvas, type DrawableShape, type SelectionHover, shallowEqual, usePaintState, useReactPaint } from '../../../src/index'

const SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: { fillColor: 'red', strokeColor: 'black' }
}

/** The anchor of a resize is the index of a point, or its place on the borders of the selection */
const describeSelectionHover = (hover: SelectionHover | undefined) => {
  if (!hover) return 'none'
  if (hover.mode !== 'resize') return hover.mode
  return typeof hover.anchor === 'number' ? `resize point ${hover.anchor}` : `resize [${hover.anchor.join(', ')}]`
}

/** Canvas used without the library editor: the pointer works as soon as it is over it, the keyboard shortcuts while the focus is inside it */
export const CanvasOnly = () => {
  const paint = useReactPaint({ shapes: [SQUARE] })
  // the selector builds an object: shallowEqual keeps it while its values are unchanged
  const { selectedShapes, shapes } = usePaintState(paint, state => ({ selectedShapes: state.selectedShapes, shapes: state.shapes }), shallowEqual)
  const { mode, hoveredShape, selectionHover } = usePaintState(paint, state => state.interaction)

  return (
    <div style={{ width: 600 }}>
      <Canvas paint={paint} options={{ canvasBackgroundColor: '#f5f5f5' }} />
      <output data-testid='status'>
        {shapes.length} shape(s) - selected:{' '}
        {selectedShapes.map(shape => ('x' in shape ? `${shape.type} at x=${Math.round(shape.x)}` : shape.type)).join(', ') || 'none'}
      </output>
      <output data-testid='hovered'> - hovered: {hoveredShape?.type ?? 'none'}</output>
      <output data-testid='selection-hover'> - selection hovered: {describeSelectionHover(selectionHover)}</output>
      <output data-testid='gesture'> - gesture: {mode}</output>
    </div>
  )
}
