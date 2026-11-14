import { MAX_PIXEL_RATIO } from '@canvas/constants/rendering'
import type { PaintStore } from '@canvas/store/paintStore'
import { clamp } from '@canvas/utils/util'
import { useLayoutEffect } from 'react'

/**
 * The canvas has the density of the screen, at least 1 and at most MAX_PIXEL_RATIO: it is sharp on a HiDPI screen. It is
 * given before the first paint, which is not blurred, and follows the density when the window goes to another screen or
 * when the browser is zoomed
 */
const usePixelRatio = (store: PaintStore) => {
  useLayoutEffect(() => {
    let query: MediaQueryList | undefined
    const followDensity = () => {
      query?.removeEventListener('change', followDensity)
      const density = window.devicePixelRatio || 1
      store.setPixelRatio(clamp(density, 1, MAX_PIXEL_RATIO))
      // the query of the current density stops matching once it changes. jsdom has no matchMedia
      query = window.matchMedia?.(`(resolution: ${density}dppx)`)
      query?.addEventListener('change', followDensity)
    }
    followDensity()
    return () => query?.removeEventListener('change', followDensity)
  }, [store])
}

export default usePixelRatio
