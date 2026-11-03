import useArrowNavigation from '@editor/hooks/useArrowNavigation'

type MenuNavigationOptions = {
  /** Closes the menu: Tab leaves it, and ArrowLeft closes a sub menu */
  onClose: (() => void) | undefined
  isSubmenu: boolean
}

/**
 * Keyboard of a menu: its items are a vertical group of useArrowNavigation, ArrowRight opens the sub menu of an item by
 * clicking it, ArrowLeft closes a sub menu, and Tab closes the menu. Returns the ref of the menu
 */
const useMenuNavigation = ({ onClose, isSubmenu }: MenuNavigationOptions) =>
  useArrowNavigation({
    orientation: 'vertical',
    items: '[role="menuitem"]',
    onKeyDown: (e, item) => {
      if (e.key === 'Tab') {
        onClose?.()
      } else if (e.key === 'ArrowRight' && item?.getAttribute('aria-haspopup') === 'menu') {
        e.preventDefault()
        item.click()
      } else if (e.key === 'ArrowLeft' && item && isSubmenu) {
        e.preventDefault()
        onClose?.()
      }
    }
  })

export default useMenuNavigation
