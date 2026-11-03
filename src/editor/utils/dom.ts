import type { Ref } from 'react'

export const isEventInsideNode = (event: Event, node: HTMLElement | null): boolean => {
  return !(event.target instanceof Node) || !node ? false : node.contains(event.target)
}

/** The elements which Tab goes through */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'

/** The elements of the container which Tab goes through, in their order */
export const getFocusables = (container: HTMLElement | null | undefined) =>
  container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []

/** Pixels the pointer travels before a press becomes a drag instead of a click */
const DRAG_THRESHOLD = 3

/** Whether the pointer went far enough from the point where it was pressed to drag */
export const isPastDragThreshold = ([x, y]: readonly [number, number], { clientX, clientY }: { clientX: number; clientY: number }) =>
  Math.abs(clientX - x) >= DRAG_THRESHOLD || Math.abs(clientY - y) >= DRAG_THRESHOLD

/** A callback ref setting each of the refs to the element */
export const mergeRefs =
  <T>(...refs: (Ref<T> | undefined)[]) =>
  (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(element)
      else if (ref) ref.current = element
    }
  }

/** Gives the focus to the first element of the container which Tab goes through */
export const focusFirst = (container: HTMLElement | null | undefined) => container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
