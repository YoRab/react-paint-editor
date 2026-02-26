import type { UtilsSettings } from '@canvas/constants/app'
import './ContextMenu.css'
import type { SelectionModeContextMenu } from '@common/types/Mode'
import type { Point } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'

type ContextMenuType = {
  selectionMode: SelectionModeContextMenu<Point | number>
  settings: UtilsSettings
}

const TOOLBAR_SIZE = 36

const ContextMenu = ({ selectionMode, settings }: ContextMenuType) => {
  const { originalShape, cursorStartPosition, anchor } = selectionMode

  const transform = `translate3D(${(cursorStartPosition[0] + settings.canvasOffset[0]) * settings.canvasSize.scaleRatio}px, ${
    TOOLBAR_SIZE + (cursorStartPosition[1] + settings.canvasOffset[1]) * settings.canvasSize.scaleRatio
  }px, 0)`

  const handleItemClick = (e: React.MouseEvent | React.TouchEvent) => {
    console.log('click')
  }

  return (
    <Menu
      className='react-paint-editor-toolbox-contextmenu'
      style={{
        '--react-paint-editor-toolbox-contextmenu-transform': transform
      }}
    >
      <Button onClick={handleItemClick}>Item 1</Button>
      <Button onClick={handleItemClick}>Item 2</Button>
    </Menu>
  )
}

export default ContextMenu
