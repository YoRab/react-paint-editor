import { RefObject, useEffect, useState } from 'react'

type UseComponentType = {
  componentRef: RefObject<HTMLElement>
}

const useComponent = ({ componentRef }: UseComponentType) => {
  const [isInsideComponent, setIsInsideComponent] = useState(false)

  useEffect(() => {
    const onDetectClick = (event: MouseEvent | TouchEvent) => {
      setIsInsideComponent(
        !(event.target instanceof Node) || !componentRef.current
          ? false
          : componentRef.current.contains(event.target)
      )
    }

    document.addEventListener('mousedown', onDetectClick)
    document.addEventListener('touchstart', onDetectClick)

    return () => {
      document.removeEventListener('mousedown', onDetectClick)
      document.removeEventListener('touchstart', onDetectClick)
    }
  }, [componentRef])

  return { isInsideComponent }
}

export default useComponent
