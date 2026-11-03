import { useCallback, useEffect, useRef } from 'react'

/**
 * Delays the calls of the callback: only the last one is made, once the delay has passed without another call. With
 * flushOnUnmount, a call still waiting is made when the component unmounts, instead of being dropped
 */
// biome-ignore lint/suspicious/noExplicitAny: any type is needed to pass any number of arguments to the callback
const useDebounce = <T extends (...args: any[]) => void>(callback: T, delay = 500, flushOnUnmount = false) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRef = useRef<(() => void) | null>(null)

  const debouncedFunction = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      pendingRef.current = () => {
        pendingRef.current = null
        callback(...args)
      }
      timeoutRef.current = setTimeout(pendingRef.current, delay)
    },
    [callback, delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (flushOnUnmount) pendingRef.current?.()
    }
  }, [flushOnUnmount])

  return debouncedFunction
}

export default useDebounce
