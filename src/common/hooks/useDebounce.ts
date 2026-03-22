import { useCallback, useEffect, useRef } from 'react'

// biome-ignore lint/suspicious/noExplicitAny: any type is needed to pass any number of arguments to the callback
const useDebounce = <T extends (...args: any[]) => void>(callback: T, delay = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedFunction = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return debouncedFunction
}

export default useDebounce
