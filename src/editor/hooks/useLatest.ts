import { useEffect, useRef } from 'react'

/** Ref holding the value of the last render, for the listeners which are not set again when it changes */
const useLatest = <T>(value: T) => {
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  })
  return latest
}

export default useLatest
