import type { UtilsSettings } from '@canvas/constants/app'
import type { PaintStore } from '@canvas/store/paintStore'
import { keepIfSame, memoizeLast } from '@canvas/store/selectors'
import type { InternalState } from '@canvas/store/types'
import type { SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { initCanvasContext } from '@canvas/utils/canvas'
import { shallowEqual } from '@canvas/utils/equality'
import { drawGrid } from '@canvas/utils/grid'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { isIdleSelectionMode } from '@canvas/utils/selection'
import { drawSelectionFrame, drawShape, drawShapeSelection } from '@canvas/utils/shapes'
import { clipMask, drawMask, getCurrentView } from '@canvas/utils/zoom'
import type React from 'react'
import { useEffect } from 'react'

/** The shapes as they are drawn, in the order of the list: the selected copy of a shape in place of the shape, without the text being edited */
const getDrawnShapes = (shapes: ShapeEntity[], selectedShape: SelectionType | undefined, isTextEdition: boolean): ShapeEntity[] => {
  const selectedShapes = getSelectedShapes(selectedShape)
  if (!selectedShapes.length) return shapes
  const selectedById = new Map(selectedShapes.map(shape => [shape.id, shape]))
  const drawnShapes: ShapeEntity[] = []
  for (const shape of shapes) {
    if (isTextEdition && shape === selectedShape) continue
    drawnShapes.push(selectedById.get(shape.id) ?? shape)
  }
  return drawnShapes
}

const renderDrawCanvas = (drawCtx: CanvasRenderingContext2D, shapes: ShapeEntity[], settings: UtilsSettings) => {
  initCanvasContext(drawCtx)
  drawMask(drawCtx, settings)
  drawGrid(drawCtx, settings)
  const currentView = getCurrentView(settings)
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(drawCtx, shapes[i]!, settings, currentView)
  }
}

const renderSelectionCanvas = (
  selectionCtx: CanvasRenderingContext2D,
  state: InternalState,
  settings: UtilsSettings,
  activeTool: ReturnType<PaintStore['selectors']['selectActiveTool']>,
  selectionWidth: number,
  selectionColor: string
) => {
  const { selectedShape } = state.document
  const { selectionMode, hoveredShape, hoverMode, selectionFrame } = state.interaction
  selectionCtx.reset()
  clipMask(selectionCtx, settings)

  state.config.options.withSkeleton &&
    hoveredShape &&
    !getSelectedShapes(selectedShape).find(selected => selected.id === hoveredShape.id) &&
    activeTool.type === 'selection' &&
    isIdleSelectionMode(selectionMode) &&
    drawShapeSelection({
      ctx: selectionCtx,
      shape: hoveredShape,
      settings,
      selectionWidth,
      selectionColor,
      hoverMode,
      selectionMode,
      withAnchors: false
    })

  selectedShape &&
    activeTool.type !== 'brush' &&
    drawShapeSelection({
      ctx: selectionCtx,
      shape: selectedShape,
      settings,
      selectionWidth,
      selectionColor,
      hoverMode,
      selectionMode,
      withAnchors: selectionMode.mode !== 'textedition'
    })

  selectionFrame &&
    drawSelectionFrame({
      ctx: selectionCtx,
      selectionFrame,
      settings
    })
}

type UseCanvasRendererProps = {
  store: PaintStore
  drawCanvas: HTMLCanvasElement | null
  selectionCanvasRef: React.RefObject<HTMLCanvasElement | null>
  selectionColor: string
  selectionWidth: number
}

/**
 * Draws the two layers of the canvas when their inputs change, outside of the renders of React:
 * each layer is drawn at most once per frame, with the last state.
 */
const useCanvasRenderer = ({ store, drawCanvas, selectionCanvasRef, selectionColor, selectionWidth }: UseCanvasRendererProps) => {
  useEffect(() => {
    /** Draws the layer in the next frame when its inputs change, and once at the start */
    const watchLayer = (selectInputs: (state: InternalState) => unknown[], render: (state: InternalState) => void) => {
      let frame = 0
      const scheduleDraw = () => {
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          render(store.getState())
        })
      }
      scheduleDraw()
      const unwatch = store.watch(selectInputs, scheduleDraw, shallowEqual)
      return () => {
        unwatch()
        cancelAnimationFrame(frame)
      }
    }

    // the drawn shapes keep their identity while they are the same: a new selection of the same shapes does not change
    // the drawing, only a selected copy which differs from its shape does, like a polygon being drawn
    const keepDrawnShapes = keepIfSame<ShapeEntity[]>()
    const computeDrawnShapes = memoizeLast((shapes: ShapeEntity[], selectedShape: SelectionType | undefined, isTextEdition: boolean) =>
      keepDrawnShapes(getDrawnShapes(shapes, selectedShape, isTextEdition))
    )
    const selectDrawnShapes = (state: InternalState) =>
      computeDrawnShapes(state.document.shapes, state.document.selectedShape, state.interaction.selectionMode.mode === 'textedition')

    const stopDrawLayer = watchLayer(
      state => [selectDrawnShapes(state), store.getSettings(state)],
      state => {
        const drawCtx = drawCanvas?.getContext('2d')
        if (drawCtx) renderDrawCanvas(drawCtx, selectDrawnShapes(state), store.getSettings(state))
      }
    )

    const stopSelectionLayer = watchLayer(
      state => [
        state.document.selectedShape,
        store.getSettings(state),
        state.interaction.selectionMode,
        state.interaction.hoveredShape,
        state.interaction.hoverMode,
        state.interaction.selectionFrame,
        store.selectors.selectActiveTool(state),
        state.config.options.withSkeleton
      ],
      state => {
        const selectionCtx = selectionCanvasRef.current?.getContext('2d')
        if (selectionCtx) {
          renderSelectionCanvas(
            selectionCtx,
            state,
            store.getSettings(state),
            store.selectors.selectActiveTool(state),
            selectionWidth,
            selectionColor
          )
        }
      }
    )

    return () => {
      stopDrawLayer()
      stopSelectionLayer()
    }
  }, [store, drawCanvas, selectionCanvasRef, selectionColor, selectionWidth])
}

export default useCanvasRenderer
