import useSetupRef from '@editor/hooks/useSetupRef'
import { isPastDragThreshold } from '@editor/utils/dom'
import { getSiblingBlocks, type LayerBlock, type LayerItem } from '@editor/utils/layers'

type LayerDragOptions = {
  /** The layers shown, in the order of their rows */
  layers: readonly LayerItem[]
  disabled: boolean
  /** Called when the layer starts to move */
  onStart: (id: string) => void
  /** Called with the new index of the shape among the shapes of its group, from the foreground */
  onDrop: (id: string, index: number) => void
}

const ROW_SELECTOR = '.react-paint-editor-layout'
const HANDLE_SELECTOR = '.react-paint-editor-layout-handle'
// the buttons of a row and the field of its name are clicked with the mouse, instead of dragging the row
const NOT_DRAGGING_SELECTOR = '.react-paint-editor-button, input'
const DROP_ATTRIBUTE = 'data-drop'
const DEPTH_PROPERTY = '--react-paint-editor-layout-depth'
const DROP_DEPTH_PROPERTY = '--react-paint-editor-layout-drop-depth'

/** Distance from the edges of the scrolled list, in pixels, where it scrolls while a layer is dragged */
const AUTO_SCROLL_EDGE = 32
/** Scroll of each frame, in pixels, with the pointer on the edge */
const AUTO_SCROLL_SPEED = 12

type LayerDrag = {
  pointerId: number
  id: string
  row: HTMLElement
  origin: [number, number]
  clientY: number
  isDragging: boolean
  /** Escape cancelled the drag: the press is only released */
  isCancelled: boolean
  layers: readonly LayerItem[] | undefined
  rows: HTMLElement[]
  blocks: LayerBlock[]
  /** Index of the layer among the blocks */
  index: number
  /** Places of the gaps before each block and after the last one, from the top of the list: its rows only scroll with it */
  gaps: number[]
  /** Distance out of the blocks, half a row, where the layer is still dropped in the closest gap */
  margin: number
  /** Index of the gap between the blocks where the layer is dropped, undefined where it would not move */
  gap: number | undefined
  marked: HTMLElement | undefined
  scroller: HTMLElement | undefined
}

/** The closest ancestor of the list which scrolls */
const getScroller = (list: HTMLElement) => {
  for (let node = list.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
  }
  return undefined
}

/** Scroll of a frame: the list scrolls faster as the pointer goes over its edge */
const getScrollSpeed = (scroller: HTMLElement, clientY: number) => {
  const { top, bottom } = scroller.getBoundingClientRect()
  const ratio = Math.max(top + AUTO_SCROLL_EDGE - clientY, 0) - Math.max(clientY - bottom + AUTO_SCROLL_EDGE, 0)
  return -Math.sign(ratio) * Math.round(AUTO_SCROLL_SPEED * Math.min(Math.abs(ratio) / AUTO_SCROLL_EDGE, 1))
}

/**
 * Gap where the layer is dropped: the closest to the pointer, among the gaps before each block and after the last one.
 * Undefined where the layer would not move, or when the pointer is out of the blocks, by more than half a row
 */
const findGap = ({ gaps, margin, index, clientY }: LayerDrag, listTop: number) => {
  if (!gaps.length) return undefined
  const y = clientY - listTop
  if (y < gaps[0]! - margin || y > gaps.at(-1)! + margin) return undefined
  let gap = 0
  for (let k = 1; k < gaps.length; k++) if (Math.abs(y - gaps[k]!) < Math.abs(y - gaps[gap]!)) gap = k
  return gap === index || gap === index + 1 ? undefined : gap
}

/**
 * Drag of the layers of the list with the pointer: from their handle, with any pointer, or from anywhere on the row with
 * the mouse, outside of its buttons. A line between the blocks of the shapes of the group of the layer shows where it goes,
 * set on the rows outside of React. The list scrolls near its edges, Escape and a cancel of the pointer cancel the drag.
 * Returns the cleanup
 */
const setupLayerDrag = (list: HTMLElement, getOptions: () => LayerDragOptions) => {
  let drag: LayerDrag | undefined
  let scrollFrame = 0

  const mark = (current: LayerDrag, row: HTMLElement | undefined, position: 'before' | 'after') => {
    if (current.marked !== row) current.marked?.removeAttribute(DROP_ATTRIBUTE)
    current.marked = row
    if (row && row.getAttribute(DROP_ATTRIBUTE) !== position) row.setAttribute(DROP_ATTRIBUTE, position)
  }

  /** Reads the blocks and their gaps again when the layers change, then shows the gap under the pointer */
  const refreshGap = (current: LayerDrag) => {
    const { layers } = getOptions()
    if (layers !== current.layers) {
      const rows = Array.from(list.querySelectorAll<HTMLElement>(ROW_SELECTOR))
      // the rows are the layers shown, in their order
      const siblings = rows.length === layers.length ? getSiblingBlocks(layers, current.id) : undefined
      const blocks = siblings?.blocks ?? []
      const { top } = list.getBoundingClientRect()
      current.layers = layers
      current.rows = rows
      current.blocks = blocks
      current.index = siblings?.index ?? -1
      current.gaps = blocks.length
        ? [
            ...blocks.map(block => rows[block.first]!.getBoundingClientRect().top - top),
            rows[blocks.at(-1)!.last]!.getBoundingClientRect().bottom - top
          ]
        : []
      current.margin = current.row.offsetHeight / 2
    }
    const gap = findGap(current, list.getBoundingClientRect().top)
    current.gap = gap
    const { rows, blocks } = current
    if (gap === undefined) mark(current, undefined, 'before')
    else if (gap < blocks.length) mark(current, rows[blocks[gap]!.first], 'before')
    else mark(current, rows[blocks.at(-1)!.last], 'after')
  }

  const scrollStep = () => {
    scrollFrame = 0
    const current = drag
    if (!current?.scroller) return
    const speed = getScrollSpeed(current.scroller, current.clientY)
    const previousTop = current.scroller.scrollTop
    current.scroller.scrollTop += speed
    // the list stops at its ends
    if (current.scroller.scrollTop === previousTop) return
    refreshGap(current)
    scrollFrame = requestAnimationFrame(scrollStep)
  }

  // Escape is listened before the panel and the shortcuts of the canvas, which leave it once prevented
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !drag) return
    e.preventDefault()
    drag.isCancelled = true
    clearMarks(drag)
  }

  /** Removes the line and the marks of the drag */
  const clearMarks = (current: LayerDrag) => {
    mark(current, undefined, 'before')
    current.row.removeAttribute('data-is-dragging')
    list.removeAttribute('data-dragging')
    list.style.removeProperty(DROP_DEPTH_PROPERTY)
    cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    window.removeEventListener('keydown', handleKeyDown, true)
  }

  // the press released after a drag does not select the layer again
  const swallowClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const end = (shouldDrop: boolean) => {
    const current = drag
    if (!current) return
    drag = undefined
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerEnd)
    window.removeEventListener('pointercancel', handlePointerEnd)
    clearMarks(current)
    if (!current.isDragging) return
    list.addEventListener('click', swallowClick, true)
    setTimeout(() => list.removeEventListener('click', swallowClick, true))
    if (shouldDrop && !current.isCancelled && current.gap !== undefined) {
      getOptions().onDrop(current.id, current.gap > current.index ? current.gap - 1 : current.gap)
    }
  }

  const startDragging = (current: LayerDrag) => {
    current.isDragging = true
    getOptions().onStart(current.id)
    current.scroller = getScroller(list)
    list.style.setProperty(DROP_DEPTH_PROPERTY, current.row.style.getPropertyValue(DEPTH_PROPERTY) || '0')
    list.setAttribute('data-dragging', '1')
    current.row.setAttribute('data-is-dragging', '1')
    window.addEventListener('keydown', handleKeyDown, true)
  }

  const handlePointerMove = (e: PointerEvent) => {
    const current = drag
    if (e.pointerId !== current?.pointerId || current.isCancelled) return
    current.clientY = e.clientY
    if (!current.isDragging) {
      if (!isPastDragThreshold(current.origin, e)) return
      startDragging(current)
    }
    refreshGap(current)
    if (!scrollFrame && current.scroller && getScrollSpeed(current.scroller, current.clientY)) scrollFrame = requestAnimationFrame(scrollStep)
  }

  // a cancel of the pointer drops nothing
  const handlePointerEnd = (e: PointerEvent) => {
    if (e.pointerId === drag?.pointerId) end(e.type === 'pointerup')
  }

  const handlePointerDown = (e: PointerEvent) => {
    if (drag || e.button !== 0 || !e.isPrimary || !(e.target instanceof Element) || getOptions().disabled) return
    const row = e.target.closest<HTMLElement>(ROW_SELECTOR)
    const id = row?.dataset.layerId
    // a layer is not dragged while it is renamed
    if (!row || !id || !list.contains(row) || row.querySelector('input')) return
    const isHandle = e.target.closest(HANDLE_SELECTOR) !== null
    if (!isHandle && (e.pointerType !== 'mouse' || e.target.closest(NOT_DRAGGING_SELECTOR))) return
    try {
      row.setPointerCapture(e.pointerId)
    } catch {
      // the synthetic events have no active pointer to capture
    }
    drag = {
      pointerId: e.pointerId,
      id,
      row,
      origin: [e.clientX, e.clientY],
      clientY: e.clientY,
      isDragging: false,
      isCancelled: false,
      layers: undefined,
      rows: [],
      blocks: [],
      index: -1,
      gaps: [],
      margin: 0,
      gap: undefined,
      marked: undefined,
      scroller: undefined
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
  }

  list.addEventListener('pointerdown', handlePointerDown)
  return () => {
    end(false)
    list.removeEventListener('pointerdown', handlePointerDown)
  }
}

/** Drag of the layers of a list with the pointer, see setupLayerDrag. Returns the ref of the list */
const useLayerDrag = (options: LayerDragOptions) => useSetupRef(setupLayerDrag, options)

export default useLayerDrag
