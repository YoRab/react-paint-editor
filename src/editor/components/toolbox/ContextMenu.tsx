import type { UtilsSettings } from '@canvas/constants/app'
import './ContextMenu.css'
import type { SelectionModeContextMenu } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { useRef } from 'react'
import useMenu from '@editor/hooks/useMenu'
import { rightChevronIcon } from '@editor/constants/icons'
import { getSelectedShapes } from '@canvas/utils/selection'

type ContextMenuType = {
  selectionMode: SelectionModeContextMenu<Point | number>
  settings: UtilsSettings
  selectAllShapes: () => void
  closeContextMenu: () => void
  toggleShapeVisibility: (shapes: ShapeEntity[]) => void
  toggleShapeLock: (shapes: ShapeEntity[]) => void
  removeShape: (shapes: ShapeEntity[]) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[], translate?: boolean, selectNewOnes?: boolean) => void
}

const TOOLBAR_SIZE = 36

const ContextMenu = ({
  selectAllShapes,
  selectionMode,
  settings,
  closeContextMenu,
  toggleShapeVisibility,
  toggleShapeLock,
  removeShape,
  duplicateShapes
}: ContextMenuType) => {
  const organizeButtonRef = useRef<HTMLDivElement>(null)
  const transformButtonRef = useRef<HTMLDivElement>(null)
  const { isOpen: isOrganizeMenuOpen } = useMenu({ trigger: 'hover', buttonElt: organizeButtonRef.current })
  const { isOpen: isTransformMenuOpen } = useMenu({ trigger: 'hover', buttonElt: transformButtonRef.current })

  const { originalShape, cursorStartPosition, anchor } = selectionMode
  const selectedShapes = getSelectedShapes(originalShape)
  const hasSelectedShape = selectedShapes.length > 0
  const hasSelectedRemovableAnchor =
    selectedShapes.length === 1 &&
    (selectedShapes[0]?.type === 'polygon' || selectedShapes[0]?.type === 'curve') &&
    !!anchor &&
    selectedShapes[0]?.points?.length > 2

  const isVisible = !selectedShapes.some(shape => shape.visible === false)
  const isLocked = selectedShapes.some(shape => shape.locked)

  const transform = `translate3D(${(cursorStartPosition[0] + settings.canvasOffset[0]) * settings.canvasSize.scaleRatio}px, ${
    TOOLBAR_SIZE + (cursorStartPosition[1] + settings.canvasOffset[1]) * settings.canvasSize.scaleRatio
  }px, 0)`

  const onDeleteAnchor = () => {
    console.log('delete anchor')
    closeContextMenu()
  }

  const onRemoveShape = () => {
    hasSelectedShape && removeShape(selectedShapes)
    closeContextMenu()
  }

  const onSelectAllShapes = () => {
    selectAllShapes()
    closeContextMenu()
  }

  const onDuplicateShape = () => {
    if (hasSelectedShape) {
      duplicateShapes(selectedShapes, true, true)
    }
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

  const onToggleShapeVisibility = () => {
    if (hasSelectedShape) {
      console.log(selectedShapes.filter(shape => (isVisible ? shape.visible !== false : shape.visible === false)))
      toggleShapeVisibility(selectedShapes.filter(shape => (isVisible ? shape.visible !== false : shape.visible === false)))
      closeContextMenu()
    }
  }

  const onToggleShapeLock = () => {
    hasSelectedShape && toggleShapeLock(selectedShapes)
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
          <Button onClick={onToggleShapeVisibility}>{isVisible ? 'Hide' : 'Show'}</Button>
          <Button onClick={onToggleShapeLock}>{isLocked ? 'Unlock' : 'Lock'}</Button>
          <Button onClick={onRemoveShape}>Delete</Button>
          <hr />
        </>
      )}
      <Button onClick={onSelectAllShapes}>Select all</Button>
    </Menu>
  )
}

export default ContextMenu
