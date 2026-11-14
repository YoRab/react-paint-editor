import { MAX_PIXEL_RATIO } from '@canvas/constants/rendering'
import type { PaintStore } from '@canvas/store/paintStore'
import { clamp } from '@canvas/utils/util'
import { useLayoutEffect } from 'react'

/**
 * The canvas has the density of the screen, at least 1 and at most MAX_PIXEL_RATIO: it is sharp on a HiDPI screen. It is
 * given before the first paint, which is not blurred
 */
const usePixelRatio = (store: PaintStore) => {
  useLayoutEffect(() => {
    store.setPixelRatio(clamp(window.devicePixelRatio || 1, 1, MAX_PIXEL_RATIO))
  }, [store])
}

export default usePixelRatio
