import Button from '@editor/components/common/Button'
import { STYLE_ZINDEX } from '@editor/constants/style'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import useEscape from '@editor/hooks/useEscape'
import useFocusReturn from '@editor/hooks/useFocusReturn'
import { focusFirst, getFocusables } from '@editor/utils/dom'
import { type ReactNode, useEffect, useRef } from 'react'
import './Modal.css'

type ModalType = {
  children: ReactNode
  /** Name of the modal, given to the assistive technologies */
  title: string
  onClose: () => void
  position?: 'center' | 'bottom'
  className?: string
  /** Adds a button closing the modal, for a modal which has none of its own */
  withCloseButton?: boolean
}

/**
 * Modal dialog: it takes the focus, Tab stays inside it, Escape and a click on the mask close it, and the focus then goes
 * back to the element which had it
 */
const Modal = ({ children, onClose, position = 'center', title, className = '', withCloseButton = false }: ModalType) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const { lang, editor } = useEditorLocale()
  useFocusReturn(ref)
  useEscape(() => [ref.current], onClose)

  useEffect(() => {
    const modal = ref.current
    if (!modal) return
    // a field of the content may have taken the focus already
    if (!modal.contains(document.activeElement)) focusFirst(modal)

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = getFocusables(modal)
      const first = focusables[0]
      const last = focusables.at(-1)
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    modal.addEventListener('keydown', trapFocus)
    return () => modal.removeEventListener('keydown', trapFocus)
  }, [])

  return (
    <div
      ref={ref}
      className='react-paint-editor-modal'
      data-position={position}
      style={{ '--react-paint-editor-modal-zindex': STYLE_ZINDEX.PANEL }}
      role='dialog'
      aria-modal='true'
      aria-label={title}
      lang={lang}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal mask should not be exposed to screen readers*/}
      <div className='react-paint-editor-modal-mask' onClick={onClose} />
      <div className={`react-paint-editor-modal-panel ${className}`}>
        {children}
        {withCloseButton && (
          <Button className='react-paint-editor-modal-close' onClick={onClose}>
            {editor.common.close}
          </Button>
        )}
      </div>
    </div>
  )
}

export default Modal
