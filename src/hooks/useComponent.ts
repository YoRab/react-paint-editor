import { RefObject, useEffect, useState } from 'react'

type UseComponentType = {
  disabled: boolean
  componentRef: RefObject<HTMLElement>
}

const useComponent = ({ disabled, componentRef }: UseComponentType) => {
  const [isInsideComponent, setIsInsideComponent] = useState(false)

  useEffect(() => {
    const onDetectClick = (event: MouseEvent | TouchEvent) => {
      setIsInsideComponent(
        !(event.target instanceof Node) || !componentRef.current
          ? false
          : componentRef.current.contains(event.target)
      )
    }
    if (disabled) {
      setIsInsideComponent(false)
    } else {
      document.addEventListener('mousedown', onDetectClick, { passive: true })
      document.addEventListener('touchstart', onDetectClick, { passive: true })
    }

    return () => {
      if (!disabled) {
        document.removeEventListener('mousedown', onDetectClick)
        document.removeEventListener('touchstart', onDetectClick)
      }
    }
  }, [disabled, componentRef])

  return { isInsideComponent }
}

export default useComponent
