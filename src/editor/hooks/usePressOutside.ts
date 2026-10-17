import { isEventInsideNode } from '@editor/utils/dom'
import { type RefObject, useEffect } from 'react'

/**
 * Calls onPressOutside when a press starts outside of the element, while it is enabled.
 * pointerdown is used for the mouse, the touch and the pen: the canvas cancels it, which removes the mousedown that follows
 */
const usePressOutside = (ref: RefObject<HTMLElement | null>, onPressOutside: () => void, enabled = true) => {
  useEffect(() => {
    if (!enabled) return
    const handlePress = (event: PointerEvent) => {
      if (!isEventInsideNode(event, ref.current)) onPressOutside()
    }
    document.addEventListener('pointerdown', handlePress)
    return () => document.removeEventListener('pointerdown', handlePress)
  }, [ref, onPressOutside, enabled])
}

export default usePressOutside
