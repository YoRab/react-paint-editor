import Panel from '@editor/components/common/Panel'
import useEscape from '@editor/hooks/useEscape'
import useFocusReturn from '@editor/hooks/useFocusReturn'
import useMenuNavigation from '@editor/hooks/useMenuNavigation'
import { focusFirst, mergeRefs } from '@editor/utils/dom'
import { useEffect, useMemo, useRef } from 'react'
import './Menu.css'

type MenuType = {
  alignment?: 'left' | 'center' | 'right' | undefined
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  position?: 'top' | 'bottom' | 'left' | 'right' | undefined
  /** Ref of the element of the menu, which contains its sub menus */
  menuRef?: React.RefObject<HTMLDivElement | null>
  /** Id of the element of the menu, which its button controls */
  id?: string | undefined
  /** Name of the menu, given to the assistive technologies */
  label?: string
  /** Closes the menu: Escape, Tab which leaves it, or ArrowLeft in a sub menu */
  onClose?: () => void
  /** Gives the focus to the first item once the menu is shown, true by default */
  autoFocus?: boolean
  /** Element given the focus when the menu closes, when no element had it before the menu was shown */
  getReturnFocus?: () => HTMLElement | null | undefined
  isSubmenu?: boolean
}

/**
 * Menu of items with the role menuitem: the keyboard moves between them, and the focus goes back where it was when the
 * menu is closed while it is inside
 */
const Menu = ({
  alignment,
  children,
  className,
  style,
  position,
  menuRef,
  id,
  label,
  onClose,
  autoFocus = true,
  getReturnFocus,
  isSubmenu = false
}: MenuType) => {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const navigationRef = useMenuNavigation({ onClose, isSubmenu })
  const setRefs = useMemo(() => mergeRefs<HTMLDivElement>(elementRef, menuRef, navigationRef), [menuRef, navigationRef])

  useFocusReturn(elementRef, getReturnFocus)
  // the first item is the one taking Tab when the menu is shown
  useEffect(() => {
    if (autoFocus) focusFirst(elementRef.current)
  }, [autoFocus])
  useEscape(
    () => [elementRef.current],
    () => onClose?.(),
    onClose !== undefined
  )

  return (
    <Panel alignment={alignment} position={position} className={className} style={style}>
      <div className='react-paint-editor-menu' role='menu' id={id} aria-label={label} ref={setRefs}>
        {children}
      </div>
    </Panel>
  )
}

export default Menu
