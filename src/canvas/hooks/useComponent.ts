import type { UtilsSettings } from '@canvas/constants/app'
import { isEventInsideNode } from '@common/utils/dom'
import { type RefObject, useEffect, useState } from 'react'

type UseComponentType = {
  settings: UtilsSettings
  componentRef: RefObject<HTMLElement | null>
}

const useComponent = ({ settings, componentRef }: UseComponentType) => {
  const [isInsideComponent, setIsInsideComponent] = useState(false)

  const disabled = !settings.features.edition && !settings.features.zoom

  useEffect(() => {
    if (disabled) {
      setIsInsideComponent(false)
    } else {
      const onDetectClick = (event: MouseEvent | TouchEvent) => {
        setIsInsideComponent(isEventInsideNode(event, componentRef.current))
      }

      document.addEventListener('mousedown', onDetectClick, { passive: true })
      document.addEventListener('touchstart', onDetectClick, { passive: true })

      return () => {
        document.removeEventListener('mousedown', onDetectClick)
        document.removeEventListener('touchstart', onDetectClick)
      }
    }
  }, [disabled, componentRef])

  return { isInsideComponent }
}

export default useComponent
