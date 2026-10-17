import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME } from '@canvas/constants/app'
import useCanvasRenderer from '@canvas/hooks/useCanvasRenderer'
import useDrawableCanvas from '@canvas/hooks/useDrawableCanvas'
import useZoom from '@canvas/hooks/useZoom'
import type { PaintStore } from '@canvas/store/paintStore'
import type { CanvasView } from '@canvas/store/selectors'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { refreshShape } from '@canvas/utils/shapes'
import { resizeTextShapeWithNewContent } from '@canvas/utils/shapes/text'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import './Canvas.css'
import EditTextBox from './EditTextBox'

type CanvasElementProps = {
  store: PaintStore
  view: CanvasView
  selectionColor: string
  selectionWidth: number
}

/**
 * Canvases of the drawing and of the selection. React only renders what changes the DOM (sizes, mode, text edition):
 * the gestures update the store, which draws the canvases and sets the cursor directly.
 */
const Canvas = ({ store, view, selectionColor, selectionWidth }: CanvasElementProps) => {
  const { canvasSize, isEditMode, canGrow, features, textEdition } = view
  const boxRef = useRef<HTMLDivElement | null>(null)
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const withSelectionCanvas = isEditMode
  const tabIndex = isEditMode ? 0 : -1

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
  useZoom({ store, canvasElt: drawCanvas, zoomEnabled: features.zoom })
  useCanvasRenderer({ store, drawCanvas, selectionCanvasRef, selectionColor, selectionWidth })

  // The cursor follows the gestures: it is set without rendering
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const applyCursor = (cursor: string) => box.style.setProperty('--react-paint-canvas-cursor', cursor)
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

      const settings = store.getSettings(state)
      const newShape = refreshShape(resizeTextShapeWithNewContent(ctx, firstShape, newText, settings), settings)

      store.updateShapes([newShape])
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
    <div className='react-paint-canvas-box' ref={boxRef}>
      <div className='react-paint-canvas-container' data-grow={canGrow}>
        <canvas
          className={DRAWCANVAS_CLASSNAME}
          ref={drawCanvasRef}
          data-grow={canGrow}
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
            width={canvasSize.width}
            height={canvasSize.height}
            data-grow={canGrow}
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
