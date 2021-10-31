import React, { ForwardedRef, MutableRefObject } from 'react'

export const useCombinedRefs = <T>(...refs: (MutableRefObject<T> | ForwardedRef<T>)[]) => {
  const targetRef = React.useRef<T>(null)

  React.useEffect(() => {
    refs.forEach(ref => {
      if (!ref) return

      if (typeof ref === 'function') {
        ref(targetRef.current)
      } else {
        ref.current = targetRef.current
      }
    })
  }, [refs])

  return targetRef
}
