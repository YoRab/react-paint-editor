import { useLayoutEffect, useMemo, useRef } from 'react'

type AnyFunction = (...args: never[]) => unknown

/**
 * Returns an object exposing the same functions, whose identity never changes but which always call
 * the implementations of the last render. The set of keys must stay the same for the lifetime of the component.
 */
const useStableCallbacks = <T extends Record<string, AnyFunction>>(callbacks: T): T => {
  const callbacksRef = useRef(callbacks)

  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: keys are fixed for the lifetime of the component
  return useMemo(() => {
    const stableCallbacks: Record<string, AnyFunction> = {}
    for (const key of Object.keys(callbacks)) {
      stableCallbacks[key] = (...args: never[]) => (callbacksRef.current[key as keyof T] as AnyFunction)(...args)
    }
    return stableCallbacks as T
  }, [])
}

export default useStableCallbacks
