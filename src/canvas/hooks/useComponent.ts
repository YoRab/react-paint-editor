import type { UtilsSettings } from '@canvas/constants/app'
import { type RefObject, useEffect, useState } from 'react'

type UseComponentType = {
  settings: UtilsSettings
  componentRef: RefObject<HTMLElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
}

const useComponent = ({ settings, componentRef, canvasRef }: UseComponentType) => {
  const [isInsideComponent, setIsInsideComponent] = useState(false)
  const [isInsideCanvas, setIsInsideCanvas] = useState(false)

  const disabled = !settings.features.edition && !settings.features.zoom

  useEffect(() => {
    if (disabled) {
      setIsInsideComponent(false)
      setIsInsideCanvas(false)
    } else {
      const onFocusIn = () => setIsInsideComponent(true)
      const onFocusOut = () => setIsInsideComponent(false)
      const onCanvasFocusIn = () => setIsInsideCanvas(true)
      const onCanvasFocusOut = () => setIsInsideCanvas(false)

      componentRef.current?.addEventListener('focusin', onFocusIn)
      componentRef.current?.addEventListener('focusout', onFocusOut)
      canvasRef.current?.addEventListener('focusin', onCanvasFocusIn)
      canvasRef.current?.addEventListener('focusout', onCanvasFocusOut)
      return () => {
        componentRef.current?.removeEventListener('focusin', onFocusIn)
        componentRef.current?.removeEventListener('focusout', onFocusOut)
        canvasRef.current?.removeEventListener('focusin', onCanvasFocusIn)
        canvasRef.current?.removeEventListener('focusout', onCanvasFocusOut)
      }
    }
  }, [disabled, componentRef, canvasRef])

  return { isInsideComponent, isInsideCanvas }
}

export default useComponent
