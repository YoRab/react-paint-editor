import useDisclosure from '@editor/hooks/useDisclosure'
import usePressOutside from '@editor/hooks/usePressOutside'
import { useCallback, useRef, useState } from 'react'

/**
 * A popup opened by its button, like a menu or the panel of a group of tools: a disclosure which closes, see
 * useDisclosure, also closed by a press outside of the container of the button and of the popup
 */
const usePopup = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const close = useCallback(() => setIsOpen(false), [])
  // the press on the button is inside: the button closes the popup itself
  usePressOutside(containerRef, close, isOpen)
  return { containerRef, isOpen, setIsOpen, close, ...useDisclosure(isOpen, close) }
}

export default usePopup
