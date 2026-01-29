import type { UtilsSettings } from '@canvas/constants/app'
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
      const onFocusIn = () => setIsInsideComponent(true)
      const onFocusOut = () => setIsInsideComponent(false)

      componentRef.current?.addEventListener('focusin', onFocusIn)
      componentRef.current?.addEventListener('focusout', onFocusOut)
      return () => {
        componentRef.current?.removeEventListener('focusin', onFocusIn)
        componentRef.current?.removeEventListener('focusout', onFocusOut)
      }
    }
  }, [disabled, componentRef])

  return { isInsideComponent }
}

export default useComponent
