import { useCallback, useEffect, useState, useTransition } from 'react'

type UseMenuProps = {
  disabled?: boolean
}

/**
 * Sub menu opened by the hover of the element given to the returned ref, which holds its item and the sub menu, and closed
 * when the pointer leaves it. Its item opens it too, for the keyboard
 */
const useMenu = ({ disabled = false }: UseMenuProps = {}) => {
  // the element is kept in a state, so that the listeners are set once it is mounted
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()

  const closeMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(false)
    })
  }, [])

  const openMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(true)
    })
  }, [])

  useEffect(() => {
    if (!element || disabled) return
    element.addEventListener('mouseenter', openMenu)
    element.addEventListener('mouseleave', closeMenu)
    return () => {
      element.removeEventListener('mouseenter', openMenu)
      element.removeEventListener('mouseleave', closeMenu)
    }
  }, [element, disabled, openMenu, closeMenu])

  return { ref: setElement, isOpen, openMenu, closeMenu }
}
export default useMenu
