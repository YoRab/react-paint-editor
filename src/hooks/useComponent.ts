import { RefObject, useEffect, useState } from 'react'
import { isEventInsideNode } from '../utils/dom'

type UseComponentType = {
  disabled: boolean
  componentRef: RefObject<HTMLElement>
}

const useComponent = ({ disabled, componentRef }: UseComponentType) => {
  const [isInsideComponent, setIsInsideComponent] = useState(false)

  useEffect(() => {
    const onDetectClick = (event: MouseEvent | TouchEvent) => {
      setIsInsideComponent(isEventInsideNode(event, componentRef.current))
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
