import type { UtilsSettings } from '@canvas/constants/app'
import type { PaintStore } from '@canvas/store/paintStore'
import type { InternalState } from '@canvas/store/types'
import { initCanvasContext } from '@canvas/utils/canvas'
import { shallowEqual } from '@canvas/utils/equality'
import { drawGrid } from '@canvas/utils/grid'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { drawSelectionFrame, drawShape, drawShapeSelection } from '@canvas/utils/shapes'
import { clipMask, drawMask, getCurrentView } from '@canvas/utils/zoom'
import type React from 'react'
import { useEffect } from 'react'

const renderDrawCanvas = (drawCtx: CanvasRenderingContext2D, state: InternalState, settings: UtilsSettings) => {
  const { shapes, selectedShape } = state.document
  const { selectionMode } = state.interaction
  initCanvasContext(drawCtx)
  drawMask(drawCtx, settings)
  drawGrid(drawCtx, settings)
  const currentView = getCurrentView(settings)
  // the selected copy of a shape is drawn in place of the shape
  const selectedById = new Map(getSelectedShapes(selectedShape).map(shape => [shape.id, shape]))
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]!
    if (selectionMode.mode === 'textedition' && shape === selectedShape) continue
    drawShape(drawCtx, selectedById.get(shape.id) ?? shape, settings, currentView)
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
    (selectionMode.mode === 'default' || selectionMode.mode === 'contextMenu' || selectionMode.mode === 'textedition') &&
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

    const selectDrawInputs = (state: InternalState) => [
      state.document.shapes,
      state.document.selectedShape,
      store.getSettings(state),
      state.interaction.selectionMode
    ]

    const stopDrawLayer = watchLayer(selectDrawInputs, state => {
      const drawCtx = drawCanvas?.getContext('2d')
      if (drawCtx) renderDrawCanvas(drawCtx, state, store.getSettings(state))
    })

    const stopSelectionLayer = watchLayer(
      state => [
        ...selectDrawInputs(state),
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
