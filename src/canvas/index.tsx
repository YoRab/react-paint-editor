import CanvasElement from '@canvas/components/Canvas'
import { type CanvasOptions, DEFAULT_CANVAS_OPTIONS } from '@canvas/constants/app'
import useAutoScroll from '@canvas/hooks/useAutoScroll'
import useKeyboard from '@canvas/hooks/useKeyboard'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import { getPaintStore } from '@canvas/store/internal'
import type { ReactPaint } from '@common/types/editor'
import { withDefaults } from '@common/utils/object'
import { type CSSProperties, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import './index.css'

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
  const { width, height, canvasSize, canGrow, canShrink } = view

  const { canvasBackgroundColor, canvasSelectionColor, canvasSelectionWidth } = withDefaults(DEFAULT_CANVAS_OPTIONS, options)

  const containerRef = useRef<HTMLDivElement>(null)

  // The size is applied in the next frame: the store renders the components synchronously, and a render inside
  // the ResizeObserver callback would resize the observed element again during the same loop
  const resizeFrame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(resizeFrame.current), [])
  const onResized = useCallback(
    (measuredWidth: number) => {
      cancelAnimationFrame(resizeFrame.current)
      resizeFrame.current = requestAnimationFrame(() => {
        const measuredHeight = (height * measuredWidth) / width
        const scaleRatio = measuredWidth / width
        store.setCanvasSize({ realWidth: width, realHeight: height, width: measuredWidth, height: measuredHeight, scaleRatio })
      })
    },
    [width, height, store]
  )

  useAutoScroll(store)
  useKeyboard(store)
  useResizeObserver({ element: containerRef, onResized })

  return (
    <div
      ref={containerRef}
      className={`react-paint-app-row${className ? ` ${className}` : ''}`}
      data-grow={canGrow}
      data-shrink={canShrink}
      style={{
        '--react-paint-app-row-width': canvasSize.width,
        '--react-paint-app-canvaswidth': width,
        '--react-paint-app-canvasheight': height,
        '--react-paint-app-row-aspectratio': `calc(${canvasSize.width} / ${canvasSize.height})`,
        '--react-paint-app-canvas-bg': canvasBackgroundColor,
        ...style
      }}
    >
      <CanvasElement store={store} view={view} selectionColor={canvasSelectionColor} selectionWidth={canvasSelectionWidth} />
    </div>
  )
}

export { type CanvasOptions, DEFAULT_OPTIONS, type OptionalOptions, type OptionalOptions as UseReactPaintOptions } from '@canvas/constants/app'
export { DEFAULT_TOOLS } from '@canvas/constants/tools'
export { default as useAnnotationsStyle } from '@canvas/hooks/useAnnotationsStyle'
export { default as useReactPaint, type UseReactPaintProps, type UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
export { MOVE_TOOL, SELECTION_TOOL } from '@common/constants/tools'
export { PaintProvider, usePaint } from '@common/context/PaintContext'
export { default as usePaintState } from '@common/hooks/usePaintState'
export type {
  ContextMenuState,
  EditorActions,
  EditorState,
  ExportView,
  InteractionMode,
  InteractionState,
  ReactPaint,
  ReactPaintEventName,
  ReactPaintEvents,
  ShapeStyleField,
  ShapesOrderAction,
  ShapesTransformAction,
  ToolSettingValue,
  ZoomAction
} from '@common/types/editor'
export type {
  ExportedDrawableShape as DrawableShape,
  ExportedDrawableShape,
  Point,
  ShapeEntity,
  ShapeType,
  StateData,
  StyleShape
} from '@common/types/Shapes'
export type { ActionsTool, CustomTool, CustomToolInput, ToolsType } from '@common/types/tools'
export { shallowEqual } from '@common/utils/equality'
export { getSelectedShapes, getSelectedShapesTools } from '@common/utils/selection'
export type { CanvasComponentProps }
export { Canvas }
