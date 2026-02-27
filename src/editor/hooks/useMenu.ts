import { useEffect, useState, useTransition } from 'react'

type UseMenuProps = {
  trigger?: 'click' | 'hover'
  buttonElt: HTMLElement | null
}

const useMenu = ({ trigger = 'click', buttonElt }: UseMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!buttonElt) return
    if (isOpen) {
      const closePanel = () => {
        startTransition(() => {
          setIsOpen(false)
        })
      }
      if (trigger === 'hover') {
        buttonElt.addEventListener('mouseleave', closePanel)
        return () => {
          buttonElt.removeEventListener('mouseleave', closePanel)
        }
      }
      document.addEventListener('click', closePanel)
      return () => {
        document.removeEventListener('click', closePanel)
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
  }, [buttonElt, isOpen, trigger])

  return { isOpen, trigger }
}
export default useMenu
