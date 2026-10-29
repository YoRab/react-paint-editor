import CanvasElement from '@canvas/components/Canvas'
import { type CanvasOptions, DEFAULT_CANVAS_OPTIONS } from '@canvas/constants/app'
import useAutoScroll from '@canvas/hooks/useAutoScroll'
import useKeyboard from '@canvas/hooks/useKeyboard'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import { getPaintStore } from '@canvas/store/internal'
import type { ReactPaint } from '@canvas/types/editor'
import { canScaleDown, canScaleUp, getScaledCanvasSize, getUnscaledCanvasSize } from '@canvas/utils/canvas'
import { withDefaults } from '@canvas/utils/object'
import { cssVar } from '@canvas/utils/util'
import { type CSSProperties, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

// fills its parent, also as an item of a flex column, whatever the size of the canvas
const EXTEND_ROOT_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  flex: '1 1 0',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden'
}

type CanvasComponentProps = {
  /** Handle returned by useReactPaint */
  paint: ReactPaint
  className?: string | undefined
  style?: CSSProperties | undefined
  options?: CanvasOptions | undefined
}

const Canvas = ({ paint, options, className, style }: CanvasComponentProps) => {
  const store = getPaintStore(paint)
  // only what changes the DOM: the gestures do not render this component
  const getView = useCallback(() => store.selectors.selectCanvasView(store.getState()), [store])
  const view = useSyncExternalStore(store.subscribe, getView, getView)
  const { width, canvasSize, resize } = view

  const { canvasBackgroundColor, canvasSelectionColor, canvasSelectionWidth, canvasLaserColor, canvasLaserWidth } = withDefaults(
    DEFAULT_CANVAS_OPTIONS,
    options
  )

  const containerRef = useRef<HTMLDivElement | null>(null)
  // the root of the Canvas is the default scope of the interactions
  const setContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element
      store.setCanvasRootElement(element)
    },
    [store]
  )

  const resizeFrame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(resizeFrame.current), [])
  const onResized = useCallback(
    (measuredWidth: number, measuredHeight: number) => {
      cancelAnimationFrame(resizeFrame.current)
      if (resize === 'extend') {
        // The visible area follows the container at the scale 1. It is applied at once, so that the canvas is redrawn before
        // the next paint: the size of the root does not depend on the canvas, which cannot resize it again
        const displayWidth = Math.round(measuredWidth)
        const displayHeight = Math.round(measuredHeight)
        if (displayWidth && displayHeight) store.setCanvasSize(getUnscaledCanvasSize(displayWidth, displayHeight))
        return
      }
      // The size is applied in the next frame: the store renders the components synchronously, and a render inside
      // the ResizeObserver callback would resize the observed element again during the same loop
      resizeFrame.current = requestAnimationFrame(() => {
        const { config } = store.getState()
        store.setCanvasSize(getScaledCanvasSize(measuredWidth, config.width, config.height))
      })
    },
    [resize, store]
  )

  useAutoScroll(store)
  useKeyboard(store)
  useResizeObserver({ element: containerRef, onResized })

  // unitless, like the variable that overrides it
  const canvasWidth = `calc(${cssVar('--react-paint-app-canvaswidth', width)} * 1px)`
  const rootStyle: CSSProperties =
    resize === 'extend'
      ? EXTEND_ROOT_STYLE
      : {
          position: 'relative',
          width: '100%',
          maxWidth: canScaleUp(resize) ? '100%' : canvasWidth,
          minWidth: canScaleDown(resize) ? undefined : canvasWidth,
          aspectRatio: cssVar('--react-paint-app-row-aspectratio', `${canvasSize.width} / ${canvasSize.height}`)
        }

  return (
    <div ref={setContainerRef} className={`react-paint-app-row${className ? ` ${className}` : ''}`} style={{ ...rootStyle, ...style }}>
      <CanvasElement
        store={store}
        view={view}
        backgroundColor={canvasBackgroundColor}
        selectionColor={canvasSelectionColor}
        selectionWidth={canvasSelectionWidth}
        laserColor={canvasLaserColor}
        laserWidth={canvasLaserWidth}
      />
    </div>
  )
}

export {
  type CanvasOptions,
  DEFAULT_OPTIONS,
  type OptionalOptions,
  type OptionalOptions as UseReactPaintOptions,
  type PictureSrcResolver
} from '@canvas/constants/app'
export { GRID_PRESETS } from '@canvas/constants/grid'
export { DEFAULT_TOOLS, ERASER_TOOL, LASER_TOOL, MOVE_TOOL, SELECTION_TOOL } from '@canvas/constants/tools'
export { ZOOM_LEVELS } from '@canvas/constants/zoom'
export { PaintProvider, usePaint } from '@canvas/context/PaintContext'
export { default as useAnnotationsStyle } from '@canvas/hooks/useAnnotationsStyle'
export { default as usePaintState } from '@canvas/hooks/usePaintState'
export { default as useReactPaint, type UseReactPaintProps, type UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
export type {
  ChangeSource,
  ContextMenuState,
  DataChanges,
  EditorActions,
  EditorState,
  ExportImageFormat,
  ExportImageOptions,
  ExportView,
  InteractionMode,
  InteractionState,
  ReactPaint,
  ReactPaintEventName,
  ReactPaintEvents,
  ResolvedOptions,
  SelectionHover,
  SelectionUpdateMode,
  ShapePointerInfo,
  ShapeStyleField,
  ShapesActionOptions,
  ShapesBounds,
  ShapesOrderAction,
  ShapesTransformAction,
  ToolSettingValue,
  ZoomAction
} from '@canvas/types/editor'
export type {
  EditableShapeType,
  ExportedDrawableShape as DrawableShape,
  ExportedDrawableShape,
  ExportedGroup,
  ExportedShape,
  GroupPatch,
  GroupShapeInput,
  MultiSelection,
  Point,
  Rect,
  SelectionType,
  ShapeData,
  ShapeEntity,
  ShapeInput,
  ShapePatch,
  ShapeType,
  StateData,
  StyleShape,
  TextShapeInput
} from '@canvas/types/Shapes'
export type { ActionsTool, CustomTool, CustomToolInput, ToolsType } from '@canvas/types/tools'
export { shallowEqual } from '@canvas/utils/equality'
export { getSelectedShapes, getSelectedShapesTools } from '@canvas/utils/selectedShapes'
export { getSelectedLeaves, getSelectionStyle } from '@canvas/utils/selection'
export { canGroupShapes, flattenShapes, getParentGroup, getShapeLeaves } from '@canvas/utils/shapes/tree'
export type { CanvasComponentProps }
export { Canvas }
