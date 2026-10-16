import { useCallback, useEffect, useRef } from 'react'

// Hooks used by the stories. The library keeps its own internal versions: like an application, a story only uses the public API

type UseResizeObserverType = {
  element: React.RefObject<HTMLElement | null>
  onResized: (width: number, height: number) => unknown
}

export const useResizeObserver = ({ onResized, element }: UseResizeObserverType) => {
  useEffect(() => {
    const current = element.current
    if (!current) return
    const resizeObserver = new ResizeObserver(entries => {
      const boxSize = entries?.[0]?.borderBoxSize?.[0]
      const { width, height } = boxSize
        ? {
            width: boxSize.inlineSize,
            height: boxSize.blockSize
          }
        : (entries?.[0]?.contentRect ?? {})
      width !== undefined && height !== undefined && onResized(width, height)
    })
    resizeObserver.observe(current)

    return () => {
      resizeObserver.unobserve(current)
    }
  }, [element, onResized])
}

// biome-ignore lint/suspicious/noExplicitAny: any type is needed to pass any number of arguments to the callback
export const useDebounce = <T extends (...args: any[]) => void>(callback: T, delay = 500) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
