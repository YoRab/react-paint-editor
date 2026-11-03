import useLatest from '@editor/hooks/useLatest'
import { type RefObject, useLayoutEffect } from 'react'

/**
 * Gives the focus back, when the component is removed, to the element which had it when the component was shown, or else
 * to the fallback, like when a click did not focus the button showing it: only when the focus was inside the element of
 * the component, or lost. The layout effect is cleaned up before its element is removed
 */
const useFocusReturn = (ref: RefObject<HTMLElement | null>, getFallback?: () => HTMLElement | null | undefined) => {
  const latestFallback = useLatest(getFallback)

  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    const element = ref.current
    return () => {
      const active = document.activeElement
      if (active && active !== document.body && !element?.contains(active)) return
      const target = previous?.isConnected && !element?.contains(previous) ? previous : latestFallback.current?.()
      target?.focus()
    }
  }, [ref, latestFallback])
}

export default useFocusReturn
