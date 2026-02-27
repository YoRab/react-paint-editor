import Panel from '@editor/components/common/Panel'
import './Menu.css'

type MenuType = {
  alignment?: 'left' | 'center' | 'right' | undefined
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  position?: 'top' | 'bottom' | 'right' | undefined
}

const Menu = ({ alignment, children, className, style, position }: MenuType) => {
  return (
    <Panel alignment={alignment} position={position} className={className} style={style}>
      <div className='react-paint-editor-menu' role='menu'>
        {children}
      </div>
    </Panel>
  )
}

export default Menu
