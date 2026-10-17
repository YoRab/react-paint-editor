import Panel from '@editor/components/common/Panel'
import './Menu.css'

type MenuType = {
  alignment?: 'left' | 'center' | 'right' | undefined
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  position?: 'top' | 'bottom' | 'left' | 'right' | undefined
  /** Ref of the element of the menu, which contains its sub menus */
  menuRef?: React.Ref<HTMLDivElement>
}

const Menu = ({ alignment, children, className, style, position, menuRef }: MenuType) => {
  return (
    <Panel alignment={alignment} position={position} className={className} style={style}>
      <div className='react-paint-editor-menu' role='menu' ref={menuRef}>
        {children}
      </div>
    </Panel>
  )
}

export default Menu
