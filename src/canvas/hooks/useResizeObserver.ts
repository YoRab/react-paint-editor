import { useLayoutEffect } from 'react'

type UseResizeObserverType = {
  element: React.RefObject<HTMLElement | null>
  onResized: (width: number, height: number) => unknown
}

/** The element is observed before the first paint: its first size is given before it is shown */
const useResizeObserver = ({ onResized, element }: UseResizeObserverType) => {
  useLayoutEffect(() => {
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

export default useResizeObserver
