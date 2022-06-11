import _ from 'lodash/fp'
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
      const { width, height } = _.get('0.borderBoxSize', entries)
        ? _.flow(_.get('0.borderBoxSize'), _.castArray, _.first, el => {
            return {
              width: _.get('inlineSize', el),
              height: _.get('blockSize', el)
            }
          })(entries)
        : _.get('0.contentRect', entries)
      onResized(width, height)
    })
    resizeObserver.observe(current)

    return () => {
      resizeObserver.unobserve(current)
    }
  }, [element, onResized])
}

export default useResizeObserver
