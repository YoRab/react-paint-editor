import { useRef } from 'react'

const DELTA_TIME_THRESHOLD_MS = 300

const useDoubleClick = () => {
  const lastClickTimestampRef = useRef<number | undefined>(undefined)
  const callbackRef = useRef<((e: MouseEvent | TouchEvent) => void) | undefined>(undefined)

  const onClick = (e: MouseEvent | TouchEvent) => {
    const currentTimestamp = new Date().getTime()
    if (
      lastClickTimestampRef.current &&
      currentTimestamp < lastClickTimestampRef.current + DELTA_TIME_THRESHOLD_MS
    ) {
      callbackRef.current?.(e)
    }
    lastClickTimestampRef.current = new Date().getTime()
  }

  const registerDoubleClickEvent = (
    element: HTMLElement,
    callback: (e: MouseEvent | TouchEvent) => void
  ) => {
    callbackRef.current = callback
    element.addEventListener('click', onClick)
    element.addEventListener('touchend', onClick)
  }

  const unRegisterDoubleClickEvent = (element: HTMLElement) => {
    element.removeEventListener('click', onClick)
    element.removeEventListener('touchend', onClick)
  }

  return { registerDoubleClickEvent, unRegisterDoubleClickEvent }
}

export default useDoubleClick
