import useLatest from '@editor/hooks/useLatest'
import { useCallback, useRef } from 'react'

/**
 * Ref of an element set up outside of React, which reads the options of the last render: the setup returns its cleanup,
 * called when the element changes or is unmounted
 */
const useSetupRef = <Options>(setup: (element: HTMLElement, getOptions: () => Options) => () => void, options: Options) => {
  const latest = useLatest(options)
  const cleanup = useRef<(() => void) | undefined>(undefined)

  return useCallback(
    (element: HTMLElement | null) => {
      cleanup.current?.()
      cleanup.current = element ? setup(element, () => latest.current) : undefined
    },
    [setup, latest]
  )
}

export default useSetupRef
