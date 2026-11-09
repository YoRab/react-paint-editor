import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME } from '@canvas/constants/app'
import type { CanvasLocale } from '@canvas/constants/locale'
import { CANVAS_SHORTCUTS, formatShortcut, getShortcutParams } from '@canvas/constants/shortcuts'
import useCanvasRenderer from '@canvas/hooks/useCanvasRenderer'
import useDrawableCanvas from '@canvas/hooks/useDrawableCanvas'
import useDropPicture from '@canvas/hooks/useDropPicture'
import useShapeEvents from '@canvas/hooks/useShapeEvents'
import useZoom from '@canvas/hooks/useZoom'
import type { PaintStore } from '@canvas/store/paintStore'
import { type CanvasView, memoizeLast } from '@canvas/store/selectors'
import { createShapesDescriber, type ShapeDescription } from '@canvas/utils/description'
import { formatMessage } from '@canvas/utils/locale'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { applyShapePatch } from '@canvas/utils/shapePatch'
import { cssVar, isMacOs } from '@canvas/utils/util'
import type React from 'react'
import { type CSSProperties, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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

// over the top of the canvas, without catching the pointer
const KEYBOARD_HINT_STYLE: CSSProperties = {
  position: 'absolute',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 12px',
  borderRadius: 6,
  font: '14px sans-serif',
  whiteSpace: 'nowrap',
  pointerEvents: 'none'
}

const KEYBOARD_HINT_KEY_STYLE: CSSProperties = {
  marginRight: 8,
  padding: '0 6px',
  border: '1px solid currentColor',
  borderRadius: 4,
  font: 'inherit'
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

/** Gives its items to a list, moving only the ones which are not at their place: a change of one shape changes one item */
const syncChildren = (list: HTMLElement, items: HTMLElement[]) => {
  const kept = new Set<Element>(items)
  for (const child of [...list.children]) if (!kept.has(child)) child.remove()
  items.forEach((item, index) => {
    const current = list.children[index]
    if (current !== item) list.insertBefore(item, current ?? null)
  })
}

/**
 * The items of a list describing shapes, a group holding the list of its shapes. A description which has not changed
 * keeps its item, which is only moved
 */
const buildDescriptionItems = (descriptions: ShapeDescription[], items: WeakMap<ShapeDescription, HTMLLIElement>): HTMLLIElement[] =>
  descriptions.map(description => {
    const cached = items.get(description)
    if (cached) return cached
    const { label, shapes } = description
    const item = document.createElement('li')
    item.textContent = label
    if (shapes) {
      const list = document.createElement('ul')
      syncChildren(list, buildDescriptionItems(shapes, items))
      item.append(list)
    }
    items.set(description, item)
    return item
  })

type CanvasElementProps = {
  store: PaintStore
  view: CanvasView
  locale: CanvasLocale
  backgroundColor: string
  selectionColor: string
  selectionWidth: number
  laserColor: string
  laserWidth: number
}

/**
 * Canvases of the drawing and of the selection. React only renders what changes the DOM (sizes, mode, text edition):
 * the gestures update the store, which draws the canvases and sets the cursor directly.
 */
const Canvas = ({ store, view, locale, backgroundColor, selectionColor, selectionWidth, laserColor, laserWidth }: CanvasElementProps) => {
  const { canvasSize, resize, isEditMode, features, textEdition, isKeyboardNavigation } = view
  const instructionsId = useId()
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
  useCanvasRenderer({ store, drawCanvas, selectionCanvasRef, selectionColor, selectionWidth, laserColor, laserWidth, canvasSize })

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

  // The fallback content of the draw canvas lists its shapes for the assistive technologies: it is never displayed. Like
  // the cursor, it is written without rendering, only when the shapes read differently, a selection during a gesture included
  useEffect(() => {
    if (!drawCanvas) return
    const describe = memoizeLast(createShapesDescriber(locale))
    const selectDescriptions = ({ document }: ReturnType<PaintStore['getState']>) =>
      describe(document.shapes, store.selectors.selectSelectedShapeIds(store.selectors.selectSelectedShapes(document.selectedShape)))
    const list = document.createElement('ul')
    list.setAttribute('aria-label', locale.canvas.shapesList)
    const items = new WeakMap<ShapeDescription, HTMLLIElement>()
    const writeDescriptions = (descriptions: ShapeDescription[]) => syncChildren(list, buildDescriptionItems(descriptions, items))
    writeDescriptions(selectDescriptions(store.getState()))
    drawCanvas.append(list)
    const unwatch = store.watch(selectDescriptions, writeDescriptions)
    return () => {
      unwatch()
      list.remove()
    }
  }, [store, drawCanvas, locale])

  // The hint is shown while the canvas has the focus from the keyboard: the focus ring, or a key pressed in the scope.
  // Like the cursor, it is shown and hidden without rendering: a press of the canvas renders nothing
  const keyboardFocusRef = useRef(false)
  const hintRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!drawCanvas) return
    const showHint = (isShown: boolean) => {
      keyboardFocusRef.current = isShown
      if (hintRef.current) hintRef.current.hidden = !isShown
    }
    // the last input in the scope, and whether a press of the canvas gives it the focus: the hint is never shown then
    let isKeyboardInput = false
    let isPressed = false
    const stopListening = store.listenScope({
      keydown: () => {
        isKeyboardInput = true
        isPressed = false
      },
      pointerdown: () => {
        isKeyboardInput = false
      }
    })
    // before the press gives the focus to the canvas. The pointer also leaves the shapes gone through from the keyboard
    const handlePress = () => {
      isKeyboardInput = false
      isPressed = true
      showHint(false)
      store.setKeyboardNavigation(false)
    }
    const handleFocus = () => showHint(!isPressed && (isKeyboardInput || drawCanvas.matches(':focus-visible')))
    // the shapes are left with the focus, unless it goes to the box editing a text
    const handleBlur = (e: FocusEvent) => {
      showHint(false)
      if (!(e.relatedTarget instanceof Node && containerRef.current?.contains(e.relatedTarget))) store.setKeyboardNavigation(false)
    }
    drawCanvas.addEventListener('pointerdown', handlePress, true)
    drawCanvas.addEventListener('focus', handleFocus)
    drawCanvas.addEventListener('blur', handleBlur)
    return () => {
      stopListening()
      drawCanvas.removeEventListener('pointerdown', handlePress, true)
      drawCanvas.removeEventListener('focus', handleFocus)
      drawCanvas.removeEventListener('blur', handleBlur)
    }
  }, [store, drawCanvas])
  const withKeyboardHint = isEditMode && features.edition && !isKeyboardNavigation && !textEdition

  const { lang, canvas: messages } = locale
  const isMac = isMacOs()
  const instructions = useMemo(() => formatMessage(messages.instructions, getShortcutParams(isMac, messages.keys), lang), [messages, isMac, lang])

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
          lang={lang}
          width={canvasSize.width}
          height={canvasSize.height}
          onContextMenu={preventRightClick}
          tabIndex={tabIndex}
          // edited, the canvas takes the keys. Its fallback content describes the drawing
          {...(isEditMode
            ? {
                role: 'application',
                'aria-roledescription': messages.roleDescription,
                'aria-label': messages.canvas,
                'aria-describedby': instructionsId
              }
            : {})}
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
        {isEditMode && (
          <div id={instructionsId} lang={lang} hidden>
            {instructions}
          </div>
        )}
        {withKeyboardHint && (
          <div
            ref={hintRef}
            className='react-paint-canvas-keyboard-hint'
            aria-hidden='true'
            lang={lang}
            hidden={!keyboardFocusRef.current}
            style={{
              ...KEYBOARD_HINT_STYLE,
              background: cssVar('--react-paint-canvas-keyboard-hint-bg', '#000000cc'),
              color: cssVar('--react-paint-canvas-keyboard-hint-color', '#ffffff')
            }}
          >
            <kbd style={KEYBOARD_HINT_KEY_STYLE}>{formatShortcut(CANVAS_SHORTCUTS.enter, isMac, messages.keys)}</kbd>
            {messages.keyboardHint}
          </div>
        )}
        {isEditMode && textEdition && (
          <EditTextBox
            label={messages.textBox}
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
