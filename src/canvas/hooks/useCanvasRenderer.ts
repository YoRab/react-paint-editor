import type { UtilsSettings } from '@canvas/constants/app'
import type { PaintStore } from '@canvas/store/paintStore'
import { keepIfSame, memoizeLast } from '@canvas/store/selectors'
import type { InternalState } from '@canvas/store/types'
import type { CanvasSize } from '@canvas/types/Canvas'
import type { SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { initCanvasContext } from '@canvas/utils/canvas'
import { shallowEqual } from '@canvas/utils/equality'
import { drawGrid } from '@canvas/utils/grid'
import { drawLaserTrail, type LaserStyle } from '@canvas/utils/laser'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { isIdleSelectionMode } from '@canvas/utils/selection'
import { type DrawShapesOptions, drawSelectionFrame, drawShapeSelection, drawShapes } from '@canvas/utils/shapes'
import { clipMask, drawMask } from '@canvas/utils/zoom'
import type React from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'

const NO_ERASED_SHAPES: string[] = []

/**
 * The shapes of the drawing as they are drawn: the selected copy of a shape in place of the shape, like a polygon being
 * drawn with its temporary point, which is not in a group
 */
const getDrawnShapes = (shapes: ShapeEntity[], selectedShape: SelectionType | undefined): ShapeEntity[] => {
  const selectedShapes = getSelectedShapes(selectedShape)
  if (!selectedShapes.length) return shapes
  const selectedById = new Map(selectedShapes.map(shape => [shape.id, shape]))
  return shapes.map(shape => selectedById.get(shape.id) ?? shape)
}

const renderDrawCanvas = (drawCtx: CanvasRenderingContext2D, shapes: ShapeEntity[], settings: UtilsSettings, options: DrawShapesOptions) => {
  initCanvasContext(drawCtx)
  drawMask(drawCtx, settings)
  drawGrid(drawCtx, settings)
  drawShapes(drawCtx, shapes, settings, options)
}

const renderSelectionCanvas = (
  selectionCtx: CanvasRenderingContext2D,
  state: InternalState,
  settings: UtilsSettings,
  activeTool: ReturnType<PaintStore['selectors']['selectActiveTool']>,
  hoveredShape: ShapeEntity | undefined,
  selectionWidth: number,
  selectionColor: string,
  laserStyle: LaserStyle
): boolean => {
  const { selectedShape } = state.document
  const { selectionMode, hoverMode, selectionFrame, laserTrail } = state.interaction
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

  // the trail of the laser fades out: it is drawn again at each frame while it changes
  return laserTrail.length > 0 && drawLaserTrail(selectionCtx, laserTrail, settings, Date.now(), selectionMode.mode === 'laser', laserStyle)
}

type UseCanvasRendererProps = {
  store: PaintStore
  drawCanvas: HTMLCanvasElement | null
  selectionCanvasRef: React.RefObject<HTMLCanvasElement | null>
  selectionColor: string
  selectionWidth: number
  laserColor: string
  laserWidth: number
  canvasSize: CanvasSize
}

type Layer = { drawNow: () => void; stop: () => void }

/**
 * Draws the two layers of the canvas when their inputs change, outside of the renders of React:
 * each layer is drawn at most once per frame, with the last state.
 */
const useCanvasRenderer = ({
  store,
  drawCanvas,
  selectionCanvasRef,
  selectionColor,
  selectionWidth,
  laserColor,
  laserWidth,
  canvasSize
}: UseCanvasRendererProps) => {
  const layersRef = useRef<Layer[]>([])

  useEffect(() => {
    /**
     * Draws the layer in the next frame when its inputs change, and once at the start. A render which returns true is
     * animated: the layer is drawn again in the next frame
     */
    const watchLayer = (selectInputs: (state: InternalState) => unknown[], render: (state: InternalState) => boolean | undefined): Layer => {
      let frame = 0
      const drawNow = () => {
        cancelAnimationFrame(frame)
        frame = 0
        if (render(store.getState())) scheduleDraw()
      }
      const scheduleDraw = () => {
        if (frame) return
        frame = requestAnimationFrame(drawNow)
      }
      scheduleDraw()
      const unwatch = store.watch(selectInputs, scheduleDraw, shallowEqual)
      return {
        drawNow,
        stop: () => {
          unwatch()
          cancelAnimationFrame(frame)
        }
      }
    }

    // the drawn shapes keep their identity while they are the same: a new selection of the same shapes does not change
    // the drawing, only a selected copy which differs from its shape does, like a polygon being drawn
    const keepDrawnShapes = keepIfSame<ShapeEntity[]>()
    const computeDrawnShapes = memoizeLast((shapes: ShapeEntity[], selectedShape: SelectionType | undefined) =>
      keepDrawnShapes(getDrawnShapes(shapes, selectedShape))
    )
    const selectDrawnShapes = ({ document }: InternalState) => computeDrawnShapes(document.shapes, document.selectedShape)
    // the text being edited is hidden under its text box, and the shapes crossed by the eraser are faded until it is released
    const buildDrawOptions = memoizeLast(
      (hiddenId: string | undefined, erasedShapeIds: string[]): DrawShapesOptions => ({ hiddenId, fadedIds: new Set(erasedShapeIds) })
    )
    const selectDrawOptions = ({ document, interaction: { selectionMode } }: InternalState) =>
      buildDrawOptions(
        selectionMode.mode === 'textedition' ? document.selectedShape?.id : undefined,
        selectionMode.mode === 'eraser' ? selectionMode.erasedShapeIds : NO_ERASED_SHAPES
      )

    const drawLayer = watchLayer(
      state => [selectDrawnShapes(state), store.getSettings(state), selectDrawOptions(state)],
      state => {
        const drawCtx = drawCanvas?.getContext('2d')
        if (drawCtx) renderDrawCanvas(drawCtx, selectDrawnShapes(state), store.getSettings(state), selectDrawOptions(state))
      }
    )

    const laserStyle: LaserStyle = { color: laserColor, width: laserWidth }
    const selectionLayer = watchLayer(
      state => [
        state.document.selectedShape,
        store.getSettings(state),
        state.interaction.selectionMode,
        store.selectors.selectHoveredShape(state),
        state.interaction.hoverMode,
        state.interaction.selectionFrame,
        store.selectors.selectActiveTool(state),
        state.config.options.withSkeleton,
        state.interaction.laserTrail
      ],
      state => {
        const selectionCtx = selectionCanvasRef.current?.getContext('2d')
        return (
          !!selectionCtx &&
          renderSelectionCanvas(
            selectionCtx,
            state,
            store.getSettings(state),
            store.selectors.selectActiveTool(state),
            store.selectors.selectHoveredShape(state),
            selectionWidth,
            selectionColor,
            laserStyle
          )
        )
      }
    )

    layersRef.current = [drawLayer, selectionLayer]
    return () => {
      drawLayer.stop()
      selectionLayer.stop()
    }
  }, [store, drawCanvas, selectionCanvasRef, selectionColor, selectionWidth, laserColor, laserWidth])

  // A new size of a canvas clears it when React sets it: both layers are drawn again before the next paint, the frame
  // painted after a resize is not empty
  // biome-ignore lint/correctness/useExhaustiveDependencies: the size is the trigger, read from the state by the layers
  useLayoutEffect(() => {
    for (const layer of layersRef.current) layer.drawNow()
  }, [canvasSize.width, canvasSize.height])
}

export default useCanvasRenderer
