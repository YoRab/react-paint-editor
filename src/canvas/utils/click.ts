import { hasPointerMoved, isTouchGesture } from '@canvas/utils/intersect'

/** A press is a click when the pointer barely moves, during less than this duration */
export const CLICK_MAX_DURATION_MS = 500

/** A second click closer to the first one than this delay is a double click */
export const DOUBLE_CLICK_DELAY_MS = 300

/** Largest distance between the two taps of a double tap, in pixels of the screen: a finger moves more than a mouse */
export const DOUBLE_TAP_MAX_DISTANCE = 20

/**
 * Tells the clicks and the double clicks of the main button from the presses and the releases of the pointer. A second
 * click soon after the first one, at the same place, is a double click, and a third click starts a new one. A release
 * which is not a click, like the end of a drag, cancels the double click
 */
export const createClickTracker = () => {
  let press: PointerEvent | undefined
  let lastClick: PointerEvent | undefined

  /** The next click starts a new double click */
  const reset = () => {
    press = undefined
    lastClick = undefined
  }

  return {
    press: (e: PointerEvent) => {
      press = e.button === 0 ? e : undefined
    },
    reset,
    /** Whether the release ends a click or a double click */
    release: (e: PointerEvent): 'click' | 'doubleClick' | undefined => {
      const start = press
      if (!start || start.pointerId !== e.pointerId || hasPointerMoved(e, start) || e.timeStamp - start.timeStamp >= CLICK_MAX_DURATION_MS) {
        reset()
        return undefined
      }
      press = undefined
      const isDoubleClick =
        !!lastClick &&
        e.timeStamp - lastClick.timeStamp < DOUBLE_CLICK_DELAY_MS &&
        !hasPointerMoved(e, lastClick, isTouchGesture(e) ? DOUBLE_TAP_MAX_DISTANCE : undefined)
      lastClick = isDoubleClick ? undefined : e
      return isDoubleClick ? 'doubleClick' : 'click'
    }
  }
}
