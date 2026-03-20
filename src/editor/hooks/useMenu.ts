import { isEventInsideNode } from '@common/utils/dom'
import { useCallback, useEffect, useState, useTransition } from 'react'

type UseMenuProps = {
  trigger?: 'click' | 'hover'
  buttonElt: HTMLElement | null
  disabled?: boolean
}

const useMenu = ({ trigger = 'click', disabled = false, buttonElt }: UseMenuProps) => {
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

  return { isOpen, trigger, closeMenu }
}
export default useMenu
