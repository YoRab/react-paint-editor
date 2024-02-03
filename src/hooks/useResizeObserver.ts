import { useEffect } from 'react'

type UseResizeObserverType = {
  element: React.RefObject<HTMLElement>
  onResized: (width: number, height: number) => unknown
}

const useResizeObserver = ({ onResized, element }: UseResizeObserverType) => {
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
        : entries?.[0].contentRect ?? {}
      onResized(width, height)
    })
    resizeObserver.observe(current)

    return () => {
      resizeObserver.unobserve(current)
    }
  }, [element, onResized])
}

export default useResizeObserver
