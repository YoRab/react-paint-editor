import { RefObject, useCallback, useEffect, useState } from 'react'

type UseComponentType = {
  componentRef: RefObject<HTMLElement>
}

export const useComponent = ({ componentRef }: UseComponentType) => {
  const [isInsideComponent, setIsInsideComponent] = useState(false)

  const onDetectClick = useCallback(
    (event: MouseEvent | TouchEvent) => {
      setIsInsideComponent(
        !(event.target instanceof HTMLElement) || !componentRef.current
          ? false
          : componentRef.current.contains(event.target)
      )
    },
    [componentRef]
  )

  useEffect(() => {
    document.addEventListener('mousedown', onDetectClick)
    document.addEventListener('touchstart', onDetectClick)

    return () => {
      document.removeEventListener('mousedown', onDetectClick)
      document.removeEventListener('touchstart', onDetectClick)
    }
  }, [onDetectClick])

  return { isInsideComponent }
}
