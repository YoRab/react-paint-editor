import type { PaintStore } from '@canvas/store/paintStore'
import type { InternalState } from '@canvas/store/types'
import { useEffect } from 'react'

/** The scroll speed is given for this interval: the move of each frame is scaled by the time elapsed */
const SPEED_INTERVAL_MS = 20

/** Scrolls the view while a selection frame is drawn close to the borders of the canvas, once per frame */
const useAutoScroll = (store: PaintStore) => {
  useEffect(() => {
    let frame = 0
    let lastTime = 0

    const scroll = (time: number) => {
      // the first frame may start before the scroll, and a hidden page pauses the frames
      const elapsed = Math.min(Math.max(time - lastTime, 0), 5 * SPEED_INTERVAL_MS)
      store.applyMoveAcceleration(elapsed / SPEED_INTERVAL_MS)
      lastTime = time
      frame = requestAnimationFrame(scroll)
    }

    const toggleScroll = (isScrolling: boolean) => {
      cancelAnimationFrame(frame)
      frame = 0
      if (isScrolling) {
        lastTime = performance.now()
        frame = requestAnimationFrame(scroll)
      }
    }

    const selectIsScrolling = (state: InternalState) => {
      const [x, y] = state.interaction.moveAcceleration
      return x !== 0 || y !== 0
    }

    toggleScroll(selectIsScrolling(store.getState()))
    const unwatch = store.watch(selectIsScrolling, toggleScroll)
    return () => {
      unwatch()
      cancelAnimationFrame(frame)
    }
  }, [store])
}

export default useAutoScroll
