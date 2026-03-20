import { useEffect, useRef } from 'react'

const useEventListener = <T extends Event>(target: EventTarget | null | undefined, event: string, handler: (e: T) => void): void => {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!target) return
    const listener = (e: Event) => handlerRef.current(e as T)
    target.addEventListener(event, listener)
    return () => {
      target.removeEventListener(event, listener)
    }
  }, [target, event])
}

export default useEventListener
