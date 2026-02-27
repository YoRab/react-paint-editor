import type { UtilsSettings } from '@canvas/constants/app'
import './ContextMenu.css'
import type { SelectionModeContextMenu } from '@common/types/Mode'
import type { Point } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { useRef } from 'react'
import useMenu from '@editor/hooks/useMenu'
import { rightChevronIcon } from '@editor/constants/icons'

type ContextMenuType = {
  selectionMode: SelectionModeContextMenu<Point | number>
  settings: UtilsSettings
  selectAllShapes: () => void
  closeContextMenu: () => void
}

const TOOLBAR_SIZE = 36

const ContextMenu = ({ selectAllShapes, selectionMode, settings, closeContextMenu }: ContextMenuType) => {
  const organizeButtonRef = useRef<HTMLDivElement>(null)
  const transformButtonRef = useRef<HTMLDivElement>(null)
  const { isOpen: isOrganizeMenuOpen } = useMenu({ trigger: 'hover', buttonElt: organizeButtonRef.current })
  const { isOpen: isTransformMenuOpen } = useMenu({ trigger: 'hover', buttonElt: transformButtonRef.current })

  const { originalShape, cursorStartPosition, anchor } = selectionMode
  const hasSelectedShape = !!originalShape
  const hasSelectedRemovableAnchor =
    (originalShape?.type === 'polygon' || originalShape?.type === 'curve') && !!anchor && originalShape?.points?.length > 2

  const transform = `translate3D(${(cursorStartPosition[0] + settings.canvasOffset[0]) * settings.canvasSize.scaleRatio}px, ${
    TOOLBAR_SIZE + (cursorStartPosition[1] + settings.canvasOffset[1]) * settings.canvasSize.scaleRatio
  }px, 0)`

  const onDeleteAnchor = () => {
    console.log('delete anchor')
    closeContextMenu()
  }

  const onDeleteShape = () => {
    console.log('delete shape')
    closeContextMenu()
  }

  const onSelectAllShapes = () => {
    selectAllShapes()
    closeContextMenu()
  }

  const onUnlockShape = () => {
    console.log('unlock shape')
    closeContextMenu()
  }

  const onLockShape = () => {
    console.log('lock shape')
    closeContextMenu()
  }

  const onDuplicateShape = () => {
    console.log('duplicate shape')
    closeContextMenu()
  }

  const onCutShape = () => {
    console.log('cut shape')
    closeContextMenu()
  }

  const onCopyShape = () => {
    console.log('copy shape')
    closeContextMenu()
  }

  const onTransformShape = () => {
    console.log('transform shape')
    closeContextMenu()
  }

  const onPasteShape = () => {
    console.log('paste shape')
    closeContextMenu()
  }

  const onMoveForward = () => {
    console.log('move forward')
    closeContextMenu()
  }

  const onMoveToFirst = () => {
    console.log('move to first')
    closeContextMenu()
  }

  const onMoveBackward = () => {
    console.log('move backward')
    closeContextMenu()
  }

  const onMoveToLast = () => {
    console.log('move to last')
    closeContextMenu()
  }

  const onFlipHorizontally = () => {
    console.log('flip horizontally')
    closeContextMenu()
  }

  const onFlipVertically = () => {
    console.log('flip vertically')
    closeContextMenu()
  }

  const onRotateClockwise = () => {
    console.log('rotate clockwise')
    closeContextMenu()
  }

  const onRotateCounterclockwise = () => {
    console.log('rotate counterclockwise')
    closeContextMenu()
  }

  return (
    <Menu
      className='react-paint-editor-toolbox-contextmenu'
      style={{
        '--react-paint-editor-toolbox-contextmenu-transform': transform
      }}
    >
      {hasSelectedShape && (
        <>
          {hasSelectedRemovableAnchor && <Button onClick={onDeleteAnchor}>Delete point</Button>}
          <div className='react-paint-editor-toolbox-contextmenu-group' ref={organizeButtonRef}>
            <Button icon={rightChevronIcon}>Organize</Button>
            {isOrganizeMenuOpen && (
              <Menu position='right'>
                <Button onClick={onMoveForward}>Move forward</Button>
                <Button onClick={onMoveToFirst}>Put on first</Button>
                <Button onClick={onMoveBackward}>Move backward</Button>
                <Button onClick={onMoveToLast}>Put on last</Button>
              </Menu>
            )}
          </div>
          <div className='react-paint-editor-toolbox-contextmenu-group' ref={transformButtonRef}>
            <Button icon={rightChevronIcon}>Transform</Button>
            {isTransformMenuOpen && (
              <Menu position='right'>
                <Button onClick={onFlipHorizontally}>Flip horizontally</Button>
                <Button onClick={onFlipVertically}>Flip vertically</Button>
                <Button onClick={onRotateClockwise}>Rotate clockwise</Button>
                <Button onClick={onRotateCounterclockwise}>Rotate counterclockwise</Button>
              </Menu>
            )}
          </div>
          <hr />
          <Button onClick={onCutShape}>Cut</Button>
          <Button onClick={onCopyShape}>Copy</Button>
        </>
      )}
      <Button onClick={onPasteShape}>Paste</Button>
      <hr />
      {hasSelectedShape && (
        <>
          <Button onClick={onDuplicateShape}>Duplicate</Button>
          {originalShape?.locked ? <Button onClick={onUnlockShape}>Unlock</Button> : <Button onClick={onLockShape}>Lock</Button>}
          <Button onClick={onDeleteShape}>Delete</Button>
          <hr />
        </>
      )}
      <Button onClick={onSelectAllShapes}>Select all</Button>
    </Menu>
  )
}

export default ContextMenu
