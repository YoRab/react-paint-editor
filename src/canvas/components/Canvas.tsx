import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME } from '@canvas/constants/app'
import useCanvasRenderer from '@canvas/hooks/useCanvasRenderer'
import useDrawableCanvas from '@canvas/hooks/useDrawableCanvas'
import useDropPicture from '@canvas/hooks/useDropPicture'
import useShapeEvents from '@canvas/hooks/useShapeEvents'
import useZoom from '@canvas/hooks/useZoom'
import type { PaintStore } from '@canvas/store/paintStore'
import type { CanvasView } from '@canvas/store/selectors'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { applyShapePatch } from '@canvas/utils/shapePatch'
import { cssVar } from '@canvas/utils/util'
import type React from 'react'
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import EditTextBox from './EditTextBox'

// The canvas module ships no stylesheet: its styles are inline, the class names are kept for the consumers,
// and the customizable properties read a CSS variable (see cssVar)
const BOX_STYLE: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const CONTAINER_STYLE: CSSProperties = {
  position: 'relative',
  backgroundSize: '16px',
  overflow: 'hidden',
  display: 'grid'
}

const CANVAS_BASE_STYLE: CSSProperties = {
  userSelect: 'none',
  // prevent scroll on touch
  touchAction: 'none'
}

type LayoutStyles = { box: CSSProperties; container: CSSProperties; canvas: CSSProperties }

// A scaled canvas fills the root, which has the bounds of the scale. Both canvases are stacked in the same cell of the grid
const SCALED_STYLES: LayoutStyles = {
  box: BOX_STYLE,
  container: { ...CONTAINER_STYLE, width: '100%', height: '100%' },
  canvas: { ...CANVAS_BASE_STYLE, position: 'relative', width: '100%', gridArea: '1 / 1' }
}

// When the canvas follows its container, the box and the container fill the root, and both canvases are stacked at the
// top left with the size of their pixels: they are never stretched, even before they are resized
const EXTEND_STYLES: LayoutStyles = {
  box: { position: 'absolute', inset: 0 },
  container: { ...CONTAINER_STYLE, position: 'absolute', inset: 0 },
  canvas: { ...CANVAS_BASE_STYLE, position: 'absolute', left: 0, top: 0 }
}

type CanvasElementProps = {
  store: PaintStore
  view: CanvasView
  backgroundColor: string
  selectionColor: string
  selectionWidth: number
}

/**
 * Canvases of the drawing and of the selection. React only renders what changes the DOM (sizes, mode, text edition):
 * the gestures update the store, which draws the canvases and sets the cursor directly.
 */
const Canvas = ({ store, view, backgroundColor, selectionColor, selectionWidth }: CanvasElementProps) => {
  const { canvasSize, resize, isEditMode, features, textEdition } = view
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const withSelectionCanvas = isEditMode
  const tabIndex = isEditMode ? 0 : -1
  const styles = resize === 'extend' ? EXTEND_STYLES : SCALED_STYLES

  // the element is kept in a state, so that the listeners are set once it is mounted
  const [drawCanvas, setDrawCanvas] = useState<HTMLCanvasElement | null>(null)
  const drawCanvasRef = useCallback(
    (element: HTMLCanvasElement | null) => {
      store.setCanvasElement(element)
      setDrawCanvas(element)
    },
    [store]
  )

  useDrawableCanvas(store, drawCanvas)
  useShapeEvents(store, drawCanvas)
  useDropPicture(store, drawCanvas)
  useZoom({ store, canvasElt: drawCanvas, zoomEnabled: features.zoom })
  useCanvasRenderer({ store, drawCanvas, selectionCanvasRef, selectionColor, selectionWidth, canvasSize })

  // The cursor follows the gestures: it is set without rendering, and the style given by React does not hold it
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const applyCursor = (cursor: string) => {
      container.style.cursor = cssVar('--react-paint-canvas-cursor', cursor)
    }
    applyCursor(store.selectors.selectCursor(store.getState()))
    return store.watch(store.selectors.selectCursor, applyCursor)
  }, [store])

  const updateSelectedShapeText = useCallback(
    (newText: string[]) => {
      const state = store.getState()
      const firstShape = getSelectedShapes(state.document.selectedShape)[0]
      if (firstShape?.type !== 'text') return

      const ctx = drawCanvas?.getContext('2d')
      if (!ctx) return

      // same rules as an update by the API: the box of the text follows its content
      store.updateShapes([applyShapePatch(ctx, firstShape, { id: firstShape.id, value: newText }, store.getSettings(state))])
    },
    [store, drawCanvas]
  )

  const preventRightClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditMode) return
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  return (
    <div className='react-paint-canvas-box' style={styles.box}>
      <div
        className='react-paint-canvas-container'
        ref={containerRef}
        style={{ ...styles.container, backgroundColor: cssVar('--react-paint-app-canvas-bg', backgroundColor) }}
      >
        <canvas
          className={DRAWCANVAS_CLASSNAME}
          ref={drawCanvasRef}
          style={styles.canvas}
          data-testid='draw-canvas'
          width={canvasSize.width}
          height={canvasSize.height}
          onContextMenu={preventRightClick}
          tabIndex={tabIndex}
        />
        {withSelectionCanvas && (
          <canvas
            className={SELECTIONCANVAS_CLASSNAME}
            ref={selectionCanvasRef}
            style={{ ...styles.canvas, pointerEvents: 'none' }}
            width={canvasSize.width}
            height={canvasSize.height}
            onContextMenu={preventRightClick}
          />
        )}
        {isEditMode && textEdition && (
          <EditTextBox
            disabled={!features.edition}
            shape={textEdition.shape}
            defaultValue={textEdition.defaultValue}
            updateValue={updateSelectedShapeText}
            saveShapes={store.actions.saveShapes}
            settings={textEdition.settings}
          />
        )}
      </div>
    </div>
  )
}

export default Canvas
