import { isEventInsideNode } from '@editor/utils/dom'
import { useCallback, useEffect, useState, useTransition } from 'react'

type UseMenuProps = {
  trigger?: 'click' | 'hover'
  disabled?: boolean
}

/** Opens a menu from the element given to the returned ref, which may be mounted after the menu */
const useMenu = ({ trigger = 'click', disabled = false }: UseMenuProps = {}) => {
  // the element is kept in a state, so that the listeners are set once it is mounted
  const [buttonElt, setButtonElt] = useState<HTMLElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()

  const closeMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(false)
    })
  }, [])

  useEffect(() => {
    if (!buttonElt || disabled) return
    if (isOpen) {
      const closePanelOnClick = (event: MouseEvent | TouchEvent) => {
        if (isEventInsideNode(event, buttonElt)) return
        startTransition(() => {
          setIsOpen(false)
        })
      }

      const closePanelOnMouseLeave = () => {
        startTransition(() => {
          setIsOpen(false)
        })
      }
      if (trigger === 'hover') {
        buttonElt.addEventListener('mouseleave', closePanelOnMouseLeave)
        return () => {
          buttonElt.removeEventListener('mouseleave', closePanelOnMouseLeave)
        }
      }
      document.addEventListener('click', closePanelOnClick)
      return () => {
        document.removeEventListener('click', closePanelOnClick)
      }
    }
    const openPanel = () => {
      startTransition(() => {
        setIsOpen(true)
      })
    }
    if (trigger === 'hover') {
      buttonElt.addEventListener('mouseenter', openPanel)
      return () => {
        buttonElt.removeEventListener('mouseenter', openPanel)
      }
    }
    buttonElt.addEventListener('click', openPanel)
    return () => {
      buttonElt.removeEventListener('click', openPanel)
    }
  }, [buttonElt, isOpen, disabled, trigger])

  return { ref: setButtonElt, isOpen, trigger, closeMenu }
}
export default useMenu
