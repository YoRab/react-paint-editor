import { ForwardedRef, MutableRefObject, useRef, useEffect } from 'react'

export const useCombinedRefs = <T>(...refs: (MutableRefObject<T> | ForwardedRef<T>)[]) => {
  const targetRef = useRef<T>(null)

  useEffect(() => {
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
