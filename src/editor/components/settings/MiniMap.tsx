import { type EditorState, type Point, type Rect, usePaint } from '@canvas/index'
import usePanTransition from '@editor/hooks/usePanTransition'
import {
  canPanView,
  createMinimapShapesCollector,
  getMinimapBounds,
  getMinimapTransform,
  getOffsetToCenter,
  MINIMAP_MARGIN_RATIO,
  MINIMAP_SIZE,
  type MinimapTransform,
  toDrawingPoint,
  toMinimapRect
} from '@editor/utils/minimap'
import { clamp } from '@editor/utils/util'
import type React from 'react'
import { useCallback, useLayoutEffect, useRef } from 'react'
import './MiniMap.css'

/** The largest pixel ratio drawn: the minimap stays sharp on a dense screen without drawing four times more pixels */
const MAX_PIXEL_RATIO = 2

/** A shape is never smaller than this, in pixels of the minimap: a line or a brush stroke stays visible */
const MIN_SHAPE_SIZE = 1

const BACKGROUND_ALPHA = 0.06
const SHAPES_ALPHA = 0.35
const VIEW_FILL_ALPHA = 0.12
const VIEW_BORDER_ALPHA = 0.8
const PAGE_BORDER_ALPHA = 0.3

/** Background of a drawing of a fixed size, drawn like a page under the shapes */
const PAGE_COLOR = 'white'

/** Pixels the pointer travels before a press becomes a drag instead of a click */
const DRAG_THRESHOLD = 3

type MiniMapType = {
  /** Color of the shapes, the background, the page and the view, each with its own opacity */
  shapesColor: string
  selectionColor: string
}

/** Draws a rectangle per box, never smaller than a pixel: the color and the opacity are set once for all of them */
const fillBoxes = (ctx: CanvasRenderingContext2D, { scale, dx, dy }: MinimapTransform, boxes: Rect[]) => {
  for (const box of boxes) {
    ctx.fillRect(box.x * scale + dx, box.y * scale + dy, Math.max(box.width * scale, MIN_SHAPE_SIZE), Math.max(box.height * scale, MIN_SHAPE_SIZE))
  }
}

/** Whether something the minimap draws has changed: the other changes of the state, like a hover, leave it as it is */
const hasMinimapChanged = (previous: EditorState, state: EditorState) =>
  previous.shapes !== state.shapes ||
  previous.selectedShapeIds !== state.selectedShapeIds ||
  previous.view !== state.view ||
  previous.width !== state.width ||
  previous.height !== state.height ||
  previous.layout !== state.layout

/**
 * Draws the minimap: one rectangle per shape drawn, the selected ones in the color of the selection, and the view over
 * them. Returns the transformation drawn, which turns a position of the minimap into a point of the drawing
 */
const drawMinimap = (
  canvas: HTMLCanvasElement,
  state: EditorState,
  { shapesColor, selectionColor }: MiniMapType,
  collectShapes: ReturnType<typeof createMinimapShapesCollector>
): MinimapTransform | undefined => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined

  const { width, height } = MINIMAP_SIZE
  const pixelRatio = clamp(window.devicePixelRatio || 1, 1, MAX_PIXEL_RATIO)
  const pixelWidth = Math.round(width * pixelRatio)
  // the resize clears the canvas, and only happens when the density of the screen changes
  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth
    canvas.height = Math.round(height * pixelRatio)
  }

  const { boxes, selectedBoxes, bounds: shapesBounds } = collectShapes(state)
  const transform = getMinimapTransform(getMinimapBounds(shapesBounds, state), MINIMAP_SIZE, MINIMAP_MARGIN_RATIO)

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = shapesColor
  ctx.strokeStyle = shapesColor

  ctx.globalAlpha = BACKGROUND_ALPHA
  ctx.fillRect(0, 0, width, height)

  // a drawing of a fixed size is a page under the shapes: the view goes beyond it when it is larger
  if (state.layout.size === 'fixed') {
    const page = toMinimapRect(transform, { x: 0, y: 0, width: state.width, height: state.height })
    ctx.globalAlpha = 1
    ctx.fillStyle = PAGE_COLOR
    ctx.fillRect(page.x, page.y, page.width, page.height)
    ctx.fillStyle = shapesColor
    ctx.globalAlpha = PAGE_BORDER_ALPHA
    ctx.strokeRect(page.x + 0.5, page.y + 0.5, page.width - 1, page.height - 1)
  }

  ctx.globalAlpha = SHAPES_ALPHA
  fillBoxes(ctx, transform, boxes)

  if (selectedBoxes.length) {
    ctx.globalAlpha = 1
    ctx.fillStyle = selectionColor
    fillBoxes(ctx, transform, selectedBoxes)
    ctx.fillStyle = shapesColor
  }

  // the view, over the shapes: the part of it outside of the minimap is cut by the canvas
  const view = toMinimapRect(transform, state.view.visibleArea)
  ctx.globalAlpha = VIEW_FILL_ALPHA
  ctx.fillRect(view.x, view.y, view.width, view.height)
  ctx.globalAlpha = VIEW_BORDER_ALPHA
  ctx.strokeRect(view.x + 0.5, view.y + 0.5, view.width - 1, view.height - 1)

  // the cursor is set without a render, like the one of the canvas
  canvas.style.cursor = canPanView(state) ? 'pointer' : 'default'

  return transform
}

/**
 * Map of the whole drawing, drawn as one rectangle per shape, with the view over them. A click moves the view there in
 * a transition, and a drag moves it along the pointer. It is drawn outside of the renders of React, once per frame
 */
const MiniMap = ({ shapesColor, selectionColor }: MiniMapType) => {
  const paint = usePaint()
  const { actions } = paint
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // transformation of the last frame drawn: a press moves the view to the point it shows
  const transformRef = useRef<MinimapTransform | undefined>(undefined)
  // the rectangle of the canvas is read once per gesture, not on each move
  const dragRef = useRef<{ pointerId: number; origin: Point; rect: DOMRect; isDragging: boolean } | undefined>(undefined)

  const getOffset = useCallback(() => paint.getState().view.offset, [paint])
  const { panTo, stop } = usePanTransition(getOffset, actions.setOffset)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const colors = { shapesColor, selectionColor }
    const collectShapes = createMinimapShapesCollector()
    let frame = 0
    // the state the last change was compared to
    let lastState = paint.getState()

    const render = () => {
      frame = 0
      transformRef.current = drawMinimap(canvas, paint.getState(), colors, collectShapes)
    }

    const scheduleDraw = () => {
      const state = paint.getState()
      if (!hasMinimapChanged(lastState, state)) return
      lastState = state
      if (!frame) frame = requestAnimationFrame(render)
    }

    render()
    const unsubscribe = paint.subscribe(scheduleDraw)
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
    }
  }, [paint, shapesColor, selectionColor])

  /** Offset of the view showing in its middle the point of the drawing under the pointer, undefined when the view cannot move */
  const getCenterOffset = ({ rect }: { rect: DOMRect }, clientX: number, clientY: number): Point | undefined => {
    const transform = transformRef.current
    const state = paint.getState()
    if (!transform || !canPanView(state)) return undefined

    const position: Point = [((clientX - rect.left) * MINIMAP_SIZE.width) / rect.width, ((clientY - rect.top) * MINIMAP_SIZE.height) / rect.height]
    return getOffsetToCenter(state.view.visibleArea, toDrawingPoint(transform, position))
  }

  // the press only starts a gesture: a drag moves the view at once, a click moves it in a transition when it is released
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    stop()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // the synthetic events have no active pointer to capture
    }
    dragRef.current = {
      pointerId: event.pointerId,
      origin: [event.clientX, event.clientY],
      rect: event.currentTarget.getBoundingClientRect(),
      isDragging: false
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag?.pointerId !== event.pointerId) return
    if (!drag.isDragging) {
      if (Math.abs(event.clientX - drag.origin[0]) < DRAG_THRESHOLD && Math.abs(event.clientY - drag.origin[1]) < DRAG_THRESHOLD) return
      drag.isDragging = true
    }
    const offset = getCenterOffset(drag, event.clientX, event.clientY)
    if (offset) actions.setOffset(offset)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag?.pointerId !== event.pointerId) return
    dragRef.current = undefined
    if (drag.isDragging) return
    const offset = getCenterOffset(drag, event.clientX, event.clientY)
    if (offset) panTo(offset)
  }

  const onPointerCancel = () => {
    dragRef.current = undefined
  }

  return (
    <canvas
      ref={canvasRef}
      className='react-paint-editor-minimap'
      data-testid='minimap'
      aria-label='Minimap'
      width={MINIMAP_SIZE.width}
      height={MINIMAP_SIZE.height}
      style={{ width: `${MINIMAP_SIZE.width}px`, height: `${MINIMAP_SIZE.height}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  )
}

export default MiniMap
