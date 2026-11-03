import useEscape from '@editor/hooks/useEscape'
import useLatest from '@editor/hooks/useLatest'
import { focusFirst } from '@editor/utils/dom'
import { useCallback, useEffect, useId, useRef } from 'react'

/**
 * A button showing a panel: the button tells whether the panel is open and which one it is. Opened from its button, the
 * panel takes the focus, on its first element which Tab goes through: the value chosen of a group of useArrowNavigation.
 * A panel which closes, like a popup, is closed by Escape in the button or in the panel, the focus going back to the
 * button, and by Tab leaving them, not by a click elsewhere. A panel without close stays open, like the one of the layers:
 * Escape gives the focus back to its button
 */
const useDisclosure = (isOpen: boolean, close?: () => void) => {
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const latestClose = useLatest(close)
  const isPersistent = close === undefined

  const closeAndFocus = useCallback(() => {
    latestClose.current?.()
    triggerRef.current?.focus()
  }, [latestClose])

  useEscape(() => [triggerRef.current, panelRef.current], closeAndFocus, isOpen)

  useEffect(() => {
    if (isOpen && triggerRef.current && document.activeElement === triggerRef.current) focusFirst(panelRef.current)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isPersistent) return
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && (!!triggerRef.current?.contains(target) || !!panelRef.current?.contains(target))
    // the focus moved by Tab is told by the key pressed before
    let isTabbing = false
    const handleKeyDown = (e: KeyboardEvent) => {
      isTabbing = e.key === 'Tab'
    }
    const handleKeyUp = () => {
      isTabbing = false
    }
    const handleFocusOut = (e: FocusEvent) => {
      if (isTabbing && isInside(e.target) && !isInside(e.relatedTarget)) latestClose.current?.()
    }
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    document.addEventListener('focusout', handleFocusOut, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
      document.removeEventListener('focusout', handleFocusOut, true)
    }
  }, [isOpen, isPersistent, latestClose])

  return {
    triggerRef,
    panelRef,
    panelId,
    /** Closes the panel and gives the focus back to its button */
    closeAndFocus,
    /** Props of the button: the panel is only referred to while it is shown */
    triggerProps: { ref: triggerRef, 'aria-expanded': isOpen, 'aria-controls': isOpen ? panelId : undefined },
    /** Props of the Panel */
    panelProps: { id: panelId, panelRef }
  }
}

export type Disclosure = ReturnType<typeof useDisclosure>

export default useDisclosure
