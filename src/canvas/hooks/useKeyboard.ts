import { KeyboardCode, KeyboardCommand, KeyboardPhysicalCode } from '@canvas/constants/keyboard'
import { PICTURE_MIME_TYPES } from '@canvas/constants/picture'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import { addPicturesAt } from '@canvas/hooks/useDropPicture'
import type { PaintStore } from '@canvas/store/paintStore'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { getFirstShapeOfGroup, getNextShape, getOffsetShowingBox } from '@canvas/utils/keyboardNavigation'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { createShape, sizeShapeOnClick, translateShapes } from '@canvas/utils/shapes'
import { removeCurvePoint } from '@canvas/utils/shapes/curve'
import { removePolygonPoint } from '@canvas/utils/shapes/polygon'
import { getCommonGroup } from '@canvas/utils/shapes/tree'
import { isStickerTool } from '@canvas/utils/tools'
import { getRectCenter } from '@canvas/utils/trigo'
import { clamp, isMacOs } from '@canvas/utils/util'
import { getCurrentView } from '@canvas/utils/zoom'
import { useEffect } from 'react'

/** A field of a form, like one of the editor: the shortcuts leave it its keys and its clipboard */
const isFormField = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement

/** A letter, whatever Shift and Caps Lock */
const isLetter = (e: KeyboardEvent, letter: string) => e.key.toLowerCase() === letter

/** A key read from its character or from its physical key: the signs and the digits move between the layouts */
const isKey = (e: KeyboardEvent, keys: readonly string[], codes: readonly string[]) => keys.includes(e.key) || codes.includes(e.code)

/** Margin around the shapes fitted in the view by Shift+1 and Shift+2, in pixels of the screen */
const ZOOM_FIT_PADDING = 20

/**
 * Type written in the clipboard of the system by a copy of shapes: a paste finding it pastes the shapes, a paste without it
 * comes from a copy made elsewhere since, an image or a text
 */
const CLIPBOARD_SHAPES_TYPE = 'application/x-react-paint-shapes'

const ARROW_DIRECTIONS: Record<string, Point> = {
  [KeyboardCode.ArrowLeft]: [-1, 0],
  [KeyboardCode.ArrowRight]: [1, 0],
  [KeyboardCode.ArrowDown]: [0, 1],
  [KeyboardCode.ArrowUp]: [0, -1]
}

/** The arrows move further with Shift */
const ARROW_SHIFT_FACTOR = 10

/** Distance an arrow moves the view without selection, in pixels of the screen */
const VIEW_STEP = 50

/** The shapes drawn by Enter, at the center of the view: the other ones follow the path of the pointer */
const KEYBOARD_SHAPE_TYPES = new Set<string>(ShapeTypeArray.filter(type => type !== 'brush' && type !== 'polygon' && type !== 'curve'))

/** A context menu opened by the pointer follows its press or its release; one opened from the keyboard does not */
const POINTER_CONTEXT_MENU_DELAY_MS = 500

/**
 * Keyboard shortcuts and modifiers. The listeners are set once on the scope (the Canvas, or the area set by scopeRef),
 * which only receives the events while the focus is inside it, and read the state when an event happens.
 */
const useKeyboard = (store: PaintStore) => {
  useEffect(() => {
    const isInteractive = () => store.selectors.selectIsInteractive(store.getState())
    const isEditingText = () => store.getState().interaction.selectionMode.mode === 'textedition'
    const hasSelection = () => store.getState().document.selectedShape !== undefined

    // like a drag of the mouse, a move made with the arrows is saved once, when the last held arrow is released
    const pressedArrows = new Set<string>()

    /** Selects a shape from the keyboard, and moves the view to show it when it is outside */
    const selectFromKeyboard = (shape: ShapeEntity | undefined) => {
      if (!shape) return
      store.actions.selectShapes([shape.id])
      const offset = getOffsetShowingBox(shape.computed.boundingBox, getCurrentView(store.getSettings()))
      if (offset) store.actions.setOffset(offset)
    }

    /** Center of the view, inside a drawing of a fixed size: where the keyboard and the clipboard add their shapes */
    const getViewCenter = (): Point => {
      const state = store.getState()
      const [viewCenterX, viewCenterY] = getRectCenter(getCurrentView(store.getSettings(state)))
      const { width, height, options } = state.config
      return options.size === 'fixed' ? [clamp(viewCenterX, 0, width), clamp(viewCenterY, 0, height)] : [viewCenterX, viewCenterY]
    }

    /** Draws a shape of the default size of its tool at the center of the view */
    const drawFromKeyboard = (tool: CustomTool) => {
      const ctx = store.getCanvasElement()?.getContext('2d')
      if (!ctx || tool.type === 'group') return
      const settings = store.getSettings()
      const center = getViewCenter()
      const stickerImage = isStickerTool(tool) ? store.getStickerImage(tool.src) : undefined
      const drawn = createShape(ctx, tool, center, settings, stickerImage)
      if (!drawn) return
      const shape = sizeShapeOnClick(drawn, center, settings) ?? drawn
      store.batch(() => {
        store.addShapes([shape])
        store.actions.saveShapes()
        store.actions.selectShapes([shape.id])
      })
      if (shape.type === 'picture') store.loadPictureOf(shape)
      if (shape.type === 'text') store.actions.editText(shape.id)
    }

    /** Enter while going through the shapes: draws a shape with a drawing tool, edits a text, or goes inside a group */
    const activateFromKeyboard = () => {
      const state = store.getState()
      const tool = store.selectors.selectActiveTool(state)
      if (KEYBOARD_SHAPE_TYPES.has(tool.type)) {
        drawFromKeyboard(tool as CustomTool)
        return
      }
      const selectedShapes = getSelectedShapes(state.document.selectedShape)
      const [shape] = selectedShapes
      if (selectedShapes.length !== 1 || !shape || shape.locked) return
      if (shape.type === 'text') store.actions.editText(shape.id)
      else if (shape.type === 'group') selectFromKeyboard(getFirstShapeOfGroup(shape))
    }

    const getSelectedIds = () => getSelectedShapes(store.getState().document.selectedShape).map(shape => shape.id)

    /** Enter ends a polygon or a curve being drawn: it is selected, without the point following the pointer */
    const endDrawing = (shape: ShapeEntity<'polygon' | 'curve'>) => {
      store.batch(() => {
        store.setSelectionMode({ mode: 'default' })
        store.setActiveTool(SELECTION_TOOL)
        // a single point draws nothing
        if (shape.points.length < 2) store.removeShapes([shape])
        else store.actions.selectShapes([shape.id])
      })
    }

    /** Backspace removes the last point of a polygon or a curve being drawn, and the shape with its first point */
    const removeLastPoint = (shape: ShapeEntity<'polygon' | 'curve'>) => {
      if (shape.points.length < 2) {
        store.batch(() => {
          store.setSelectionMode({ mode: 'default' })
          store.removeShapes([shape])
        })
        return
      }
      const settings = store.getSettings()
      const lastIndex = shape.points.length - 1
      store.updateShapes(
        [shape.type === 'curve' ? removeCurvePoint(shape, lastIndex, settings) : removePolygonPoint(shape, lastIndex, settings)],
        true
      )
    }

    // The keys opening a context menu (Shift+F10, the menu key) give a context menu event without a pointer
    const pointers = { down: 0, releaseTime: 0 }
    const handlePointerDown = () => {
      pointers.down++
    }
    const handlePointerEnd = () => {
      pointers.down = Math.max(0, pointers.down - 1)
      pointers.releaseTime = Date.now()
    }
    const isFromPointer = (e: MouseEvent) =>
      !!(e as PointerEvent).pointerType || pointers.down > 0 || Date.now() - pointers.releaseTime < POINTER_CONTEXT_MENU_DELAY_MS

    /** Opens the context menu from the keyboard, on the selection, or at the center of the view without selection */
    const handleContextMenu = (e: MouseEvent) => {
      if (e.target !== store.getCanvasElement() || isFromPointer(e)) return
      const state = store.getState()
      if (!store.selectors.selectWithContextMenu(state)) return
      e.preventDefault()
      const selection = state.document.selectedShape
      const view = getCurrentView(store.getSettings(state))
      const point: Point = selection ? selection.computed.center : getRectCenter(view)
      const [centerX, centerY] = getRectCenter(store.getCanvasElement()!.getBoundingClientRect())
      const clientPosition = store.toClientPosition(point) ?? { x: centerX, y: centerY }
      store.showContextMenu({ cursorStartPosition: point, clientPosition, originalShape: selection, anchor: undefined })
    }

    /** A copy or a cut of the selection, which marks the clipboard of the system: see CLIPBOARD_SHAPES_TYPE */
    const handleCopyOrCut = (action: 'copy' | 'cut') => (e: ClipboardEvent) => {
      if (!isInteractive() || !hasSelection() || isEditingText() || isFormField(e.target)) return
      e.preventDefault()
      e.clipboardData?.setData(CLIPBOARD_SHAPES_TYPE, 'shapes')
      store.actions[action]()
    }

    /** A text pasted becomes a text of the text tool, centered in the view and selected, in a single step of the history */
    const pasteText = (textToolId: string, text: string) => {
      const center = getViewCenter()
      const value = text.split(/\r\n|\r|\n/)
      store.transaction(() => {
        const [id] = store.actions.addShapes([{ type: 'text', toolId: textToolId, x: center[0], y: center[1], value }], { select: true })
        const bounds = id === undefined ? undefined : store.getBounds([id])
        if (id !== undefined && bounds) store.actions.translateShapes([id], [center[0] - bounds.center[0], center[1] - bounds.center[1]])
      })
    }

    /**
     * The shapes copied in the canvas, or else what the clipboard of the system holds: images, which follow the option of the
     * dropped pictures, or a text. The shapes come first when the clipboard of the system is the one marked by their copy,
     * or is not readable
     */
    const handlePaste = (e: ClipboardEvent) => {
      if (!isInteractive() || isEditingText() || isFormField(e.target)) return
      const state = store.getState()
      if (!store.selectors.selectFeatures(state).edition) return
      const hasCopiedShapes = state.clipboard !== undefined
      const data = e.clipboardData
      const isOwnCopy = hasCopiedShapes && (!data || data.types.includes(CLIPBOARD_SHAPES_TYPE))
      if (!isOwnCopy) {
        const pictures = Array.from(data?.files ?? []).filter(file => PICTURE_MIME_TYPES.includes(file.type))
        if (pictures.length && store.selectors.selectWithDropPicture(state)) {
          e.preventDefault()
          void addPicturesAt(store, pictures, getViewCenter())
          return
        }
        const text = data?.getData('text/plain').trim()
        const textTool = state.tools.available.find(tool => tool.type === 'text')
        if (text && textTool) {
          e.preventDefault()
          pasteText(textTool.id, text)
          return
        }
      }
      // the shapes copied before, if any
      if (hasCopiedShapes) {
        e.preventDefault()
        store.actions.paste()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // the move is saved even if the canvas is no longer interactive: it was made
      if (pressedArrows.delete(e.key) && !pressedArrows.size) store.actions.saveShapes()
      if (!isInteractive()) return
      switch (e.key) {
        case KeyboardCode.Shift:
          store.setModifiers({ shift: false })
          break
        case KeyboardCode.Alt:
        case KeyboardCode.Option:
          store.setModifiers({ alt: false })
          break
        case KeyboardCode.Space:
          store.setModifiers({ space: false })
          break
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // a key handled by an element of the scope, like a menu of the editor, is left to it
      if (!isInteractive() || e.defaultPrevented) return
      // only the modifiers are followed in a field
      const isInField = isFormField(e.target)
      if ((e.metaKey || e.ctrlKey) && !isInField) {
        if (isLetter(e, 'z')) {
          e.preventDefault()
          e.stopPropagation()
          if (e.shiftKey) {
            store.actions.redo()
          } else {
            store.actions.undo()
          }
          return
        }
        if (!isMacOs() && isLetter(e, 'y')) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.redo()
          return
        }

        if (isLetter(e, 'a')) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.selectAllShapes()
          return
        }

        // Ctrl+G is also the next result of a search of the browser, which is prevented
        if (isLetter(e, 'g') && !isEditingText()) {
          e.preventDefault()
          e.stopPropagation()
          const ids = getSelectedIds()
          if (e.shiftKey) {
            store.actions.ungroupShapes(ids)
          } else {
            store.actions.groupShapes(ids)
          }
          return
        }

        // Ctrl+D is also a bookmark of the browser, which is prevented
        if (isLetter(e, 'd') && !isEditingText()) {
          e.preventDefault()
          e.stopPropagation()
          const ids = getSelectedIds()
          if (ids.length) store.actions.duplicateShapes(ids, { translate: true, select: true })
          return
        }

        // the order of the selection: forward and backward, to the foreground and to the background with Shift
        const isForward = isKey(e, [KeyboardCode.BracketRight], [KeyboardPhysicalCode.BracketRight])
        if ((isForward || isKey(e, [KeyboardCode.BracketLeft], [KeyboardPhysicalCode.BracketLeft])) && !isEditingText()) {
          e.preventDefault()
          e.stopPropagation()
          const ids = getSelectedIds()
          const { shift } = store.getState().interaction.modifiers
          if (ids.length) store.actions.moveShapes(ids, isForward ? (shift ? 'first' : 'forward') : shift ? 'last' : 'backward')
          return
        }

        // Ctrl+Shift+L locks the selection, Ctrl+Shift+H hides it, or the other way round when it already is
        if ((isLetter(e, 'l') || isLetter(e, 'h')) && store.getState().interaction.modifiers.shift && !isEditingText()) {
          e.preventDefault()
          e.stopPropagation()
          const shapes = getSelectedShapes(store.getState().document.selectedShape)
          const ids = shapes.map(shape => shape.id)
          if (!ids.length) return
          if (isLetter(e, 'l')) store.actions.setShapesLocked(ids, !shapes.some(shape => shape.locked))
          else
            store.actions.setShapesVisibility(
              ids,
              shapes.some(shape => shape.visible === false)
            )
          return
        }

        // Ctrl+= is the zoom of the browsers too, and the digits are read from their key, whatever the layout
        if (isKey(e, [KeyboardCode.Plus, KeyboardCode.Equal], [KeyboardPhysicalCode.Equal, KeyboardPhysicalCode.NumpadAdd])) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.setZoom('zoom')
          return
        }
        if (isKey(e, [KeyboardCode.Minus], [KeyboardPhysicalCode.Minus, KeyboardPhysicalCode.NumpadSubtract])) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.setZoom('unzoom')
          return
        }
        if (isKey(e, [KeyboardCode.Zero], [KeyboardPhysicalCode.Digit0, KeyboardPhysicalCode.Numpad0])) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.resetZoom()
          return
        }
      }
      if (e.key === KeyboardCode.Shift) {
        e.preventDefault()
        e.stopPropagation()
        store.setModifiers({ shift: true })
        return
      }
      if (e.key === KeyboardCode.Space) {
        if (store.getState().interaction.focus.canvas) {
          e.preventDefault()
          e.stopPropagation()
          store.setModifiers({ space: true })
          return
        }
      }
      if (e.key === KeyboardCode.Alt || e.key === KeyboardCode.Option) {
        e.preventDefault()
        e.stopPropagation()
        store.setModifiers({ alt: true })
        return
      }

      // a stroke of the eraser is cancelled: it removes nothing. So is a pick of a color
      const { mode } = store.getState().interaction.selectionMode
      if (e.key === KeyboardCode.Escape && (mode === 'eraser' || mode === 'eyedropper')) {
        store.setSelectionMode({ mode: 'default' })
        return
      }

      const state = store.getState()
      const { selectedShape } = state.document
      const { keyboardNavigation, modifiers } = state.interaction
      const isOnCanvas = e.target === store.getCanvasElement()

      const isShiftShortcut = modifiers.shift && !e.ctrlKey && !e.metaKey && !e.altKey && !isInField && !isEditingText()
      // Shift+1 fits the drawing in the view, Shift+2 the selection: the digits are read from their key
      if (isShiftShortcut && (e.code === KeyboardPhysicalCode.Digit1 || e.code === KeyboardPhysicalCode.Digit2)) {
        e.preventDefault()
        e.stopPropagation()
        if (e.code === KeyboardPhysicalCode.Digit1) store.actions.zoomToShapes(undefined, { padding: ZOOM_FIT_PADDING })
        else if (selectedShape) store.actions.zoomToShapes(getSelectedIds(), { padding: ZOOM_FIT_PADDING })
        return
      }
      // Shift+H flips the selection horizontally, Shift+V vertically
      if (isShiftShortcut && (isLetter(e, 'h') || isLetter(e, 'v'))) {
        e.preventDefault()
        e.stopPropagation()
        const shapes = getSelectedShapes(selectedShape)
        if (shapes.length && !shapes.some(shape => shape.locked)) {
          store.actions.transformShapes(
            shapes.map(shape => shape.id),
            isLetter(e, 'h') ? 'flipHorizontally' : 'flipVertically'
          )
        }
        return
      }

      // a polygon or a curve being drawn: Enter ends it, Backspace removes its last point
      // (Enter on a button of the scope clicks it)
      const endsDrawing = e.key === KeyboardCode.Enter && isOnCanvas
      const removesPoint = e.key === KeyboardCode.Backspace || e.key === KeyboardCode.Delete
      if (mode === 'preview' && !isInField && (endsDrawing || removesPoint)) {
        // the selected shape is the one being drawn
        const [drawn] = getSelectedShapes(selectedShape)
        if (drawn?.type === 'polygon' || drawn?.type === 'curve') {
          e.preventDefault()
          e.stopPropagation()
          if (endsDrawing) endDrawing(drawn)
          else removeLastPoint(drawn)
          return
        }
      }

      // Enter on the canvas goes through its shapes with Tab, which stays on the canvas until Escape leaves them
      if (isOnCanvas && store.selectors.selectFeatures(state).edition) {
        if (e.key === KeyboardCode.Enter) {
          e.preventDefault()
          if (keyboardNavigation) activateFromKeyboard()
          else store.setKeyboardNavigation(true)
          return
        }
        if (e.key === KeyboardCode.Tab && keyboardNavigation) {
          e.preventDefault()
          selectFromKeyboard(getNextShape(state.document.shapes, getSelectedShapes(selectedShape), modifiers.shift ? -1 : 1))
          return
        }
      }

      if (!selectedShape) {
        if (e.key === KeyboardCode.Escape && keyboardNavigation) store.setKeyboardNavigation(false)
        // without selection, the arrows move the view
        else if (isOnCanvas && e.key in ARROW_DIRECTIONS) {
          e.preventDefault()
          const [x, y] = ARROW_DIRECTIONS[e.key]!
          const distance = modifiers.shift ? VIEW_STEP * ARROW_SHIFT_FACTOR : VIEW_STEP
          store.scrollBy([x * distance, y * distance])
        }
        return
      }
      if (isInField) return

      if (e.key === KeyboardCode.Escape) {
        // a gesture of the pointer is cancelled, with the selection it started from
        if (store.cancelGesture()) {
          e.preventDefault()
          return
        }
        // the selection goes up to the group holding the selected shapes, a text being edited included, or is cleared.
        // Going through the shapes, a text being edited stays selected, and a cleared selection leaves the shapes
        const { shapes } = state.document
        const group = getCommonGroup(shapes, getSelectedShapes(selectedShape))
        const wasEditingText = isEditingText()
        const keepsSelection = wasEditingText && keyboardNavigation
        store.batch(() => {
          if (!keepsSelection) store.setSelectedShape(group)
          store.setActiveTool(SELECTION_TOOL)
          store.setSelectionMode({ mode: 'default' })
          store.setSelectionFrame(undefined)
          if (keyboardNavigation && !keepsSelection && !group) store.setKeyboardNavigation(false)
        })
        // the text box closes with the focus: the canvas takes it, for the next shortcuts
        if (wasEditingText) store.focusCanvas()
        return
      }
      if (isEditingText()) return

      switch (e.key) {
        case KeyboardCode.ArrowLeft:
        case KeyboardCode.ArrowRight:
        case KeyboardCode.ArrowDown:
        case KeyboardCode.ArrowUp: {
          e.preventDefault()
          e.stopPropagation()
          pressedArrows.add(e.key)
          // by 1, or by the gap of the grid, and further with Shift
          const step = (store.getSettings().gridGap || 1) * (modifiers.shift ? ARROW_SHIFT_FACTOR : 1)
          const [x, y] = ARROW_DIRECTIONS[e.key]!
          store.updateShapes(translateShapes([x * step, y * step], selectedShape, [0, 0], store.getSettings(), true))
          break
        }
        case KeyboardCode.Delete:
        case KeyboardCode.Backspace:
          e.preventDefault()
          e.stopPropagation()
          store.removeShapes(getSelectedShapes(selectedShape))
          break
      }
    }

    // the keys released outside of the scope are not received: the move ends when the focus leaves it
    const handleFocusOut = (e: FocusEvent) => {
      if (!pressedArrows.size || (e.relatedTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node))) return
      pressedArrows.clear()
      store.actions.saveShapes()
    }

    return store.listenScope({
      keydown: handleKeyDown,
      keyup: handleKeyUp,
      focusout: handleFocusOut,
      contextmenu: handleContextMenu,
      pointerdown: handlePointerDown,
      pointerup: handlePointerEnd,
      pointercancel: handlePointerEnd,
      [KeyboardCommand.Copy]: handleCopyOrCut('copy'),
      [KeyboardCommand.Paste]: handlePaste,
      [KeyboardCommand.Cut]: handleCopyOrCut('cut')
    })
  }, [store])
}

export default useKeyboard
