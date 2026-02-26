import type { UtilsSettings } from '@canvas/constants/app'
import './ContextMenu.css'
import type { SelectionModeContextMenu } from '@common/types/Mode'
import type { Point } from '@common/types/Shapes'

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

  const preventClickPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const handleItemClick = (e: React.MouseEvent | React.TouchEvent) => {
    console.log('click')
  }

  return (
    <div
      role='menu'
      className='react-paint-editor-toolbox-contextmenu'
      onContextMenu={preventClickPropagation}
      onMouseUp={preventClickPropagation}
      onTouchEnd={preventClickPropagation}
      style={{
        '--react-paint-editor-toolbox-contextmenu-transform': transform
      }}
    >
      <button type='button' onClick={handleItemClick}>
        Item 1
      </button>
      <button type='button' onClick={handleItemClick}>
        Item 2
      </button>
    </div>
  )
}

export default ContextMenu
