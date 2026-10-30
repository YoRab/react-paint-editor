import type { Point } from '@canvas/index'
import { useCallback, useEffect, useRef } from 'react'

/** Duration of the transition of the view, in milliseconds */
const TRANSITION_MS = 250

/** Offsets closer than this are reached at once, without a transition */
const TRANSITION_MIN_DISTANCE = 0.5

const easeOut = (ratio: number) => 1 - (1 - ratio) ** 3

/**
 * Moves the view to an offset in a transition, one step per frame. The transition is given up when the view is moved
 * elsewhere meanwhile, by the canvas or by another control, and a new one replaces the one running
 */
const usePanTransition = (getOffset: () => Point, setOffset: (offset: Point) => void) => {
  const frame = useRef(0)

  const stop = useCallback(() => cancelAnimationFrame(frame.current), [])

  const panTo = useCallback(
    (target: Point) => {
      stop()
      const start = getOffset()
      if (Math.abs(target[0] - start[0]) < TRANSITION_MIN_DISTANCE && Math.abs(target[1] - start[1]) < TRANSITION_MIN_DISTANCE) {
        setOffset(target)
        return
      }

      const startTime = performance.now()
      // the offset written by the last step: the view has moved elsewhere when it no longer holds it
      let written = start

      const step = (time: number) => {
        const current = getOffset()
        if (current[0] !== written[0] || current[1] !== written[1]) return

        const ratio = Math.min((time - startTime) / TRANSITION_MS, 1)
        const eased = easeOut(ratio)
        setOffset([start[0] + (target[0] - start[0]) * eased, start[1] + (target[1] - start[1]) * eased])
        // the offset is kept inside a drawing of a fixed size: the one applied is read back
        written = getOffset()
        if (ratio < 1) frame.current = requestAnimationFrame(step)
      }

      frame.current = requestAnimationFrame(step)
    },
    [getOffset, setOffset, stop]
  )

  useEffect(() => stop, [stop])

  return { panTo, stop }
}

export default usePanTransition
