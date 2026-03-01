import type { UtilsSettings } from '@canvas/constants/app'
import './ContextMenu.css'
import type { SelectionModeContextMenu } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { useRef } from 'react'
import useMenu from '@editor/hooks/useMenu'
import { rightChevronIcon } from '@editor/constants/icons'
import { getSelectedShapes } from '@canvas/utils/selection'
import { copyShapes } from '@canvas/utils/shapes'
import { buildShapesGroup } from '@canvas/utils/selection'

type ContextMenuType = {
  selectionMode: SelectionModeContextMenu<Point | number>
  settings: UtilsSettings
  selectAllShapes: () => void
  closeContextMenu: () => void
  toggleShapeVisibility: (shapes: ShapeEntity[]) => void
  toggleShapeLock: (shapes: ShapeEntity[]) => void
  removeShape: (shapes: ShapeEntity[]) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[], translate?: boolean, selectNewOnes?: boolean) => void
  setCopiedShape: (shape: React.SetStateAction<SelectionType | undefined>) => void
  copiedShape: SelectionType | undefined
  pasteShapes: (shapes: ShapeEntity[]) => void
  moveShapes: (shapes: ShapeEntity[], action: 'first' | 'last' | 'forward' | 'backward') => void
  removeShapePoint: (shape: ShapeEntity<'curve' | 'polygon'>, pointIndex: number) => void
  transformShape: (
    shapes: ShapeEntity[],
    center: Point,
    action: 'flipHorizontally' | 'flipVertically' | 'rotateClockwise' | 'rotateCounterclockwise'
  ) => void
}

const TOOLBAR_SIZE = 36

const ContextMenu = ({
  moveShapes,
  selectAllShapes,
  selectionMode,
  transformShape,
  settings,
  closeContextMenu,
  toggleShapeVisibility,
  toggleShapeLock,
  removeShape,
  duplicateShapes,
  copiedShape,
  setCopiedShape,
  pasteShapes,
  removeShapePoint
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
    anchor !== undefined &&
    selectedShapes[0]?.points?.length > 2

  const isVisible = !selectedShapes.some(shape => shape.visible === false)
  const isLocked = selectedShapes.some(shape => shape.locked)

  const transform = `translate3D(${(cursorStartPosition[0] + settings.canvasOffset[0]) * settings.canvasSize.scaleRatio}px, ${
    TOOLBAR_SIZE + (cursorStartPosition[1] + settings.canvasOffset[1]) * settings.canvasSize.scaleRatio
  }px, 0)`

  const onDeleteAnchor = () => {
    if (hasSelectedRemovableAnchor) {
      removeShapePoint(selectedShapes[0] as ShapeEntity<'curve' | 'polygon'>, anchor as number)
    }
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
    if (hasSelectedShape) {
      setCopiedShape(buildShapesGroup(selectedShapes, settings))
      removeShape(selectedShapes)
    }
    closeContextMenu()
  }

  const onCopyShape = () => {
    if (hasSelectedShape) {
      setCopiedShape(buildShapesGroup(selectedShapes, settings))
    }
    closeContextMenu()
  }

  const onPasteShape = () => {
    if (copiedShape) {
      pasteShapes(copyShapes(copiedShape, settings))
    }
    closeContextMenu()
  }

  const onMoveForward = () => {
    if (hasSelectedShape) {
      moveShapes(selectedShapes, 'forward')
    }
    closeContextMenu()
  }

  const onMoveToFirst = () => {
    if (hasSelectedShape) {
      moveShapes(selectedShapes, 'first')
    }
    closeContextMenu()
  }

  const onMoveBackward = () => {
    if (hasSelectedShape) {
      moveShapes(selectedShapes, 'backward')
    }
    closeContextMenu()
  }

  const onMoveToLast = () => {
    if (hasSelectedShape) {
      moveShapes(selectedShapes, 'last')
    }
    closeContextMenu()
  }

  const onFlipHorizontally = () => {
    if (hasSelectedShape) {
      transformShape(selectedShapes, originalShape!.computed.center, 'flipHorizontally')
    }
    closeContextMenu()
  }

  const onFlipVertically = () => {
    if (hasSelectedShape) {
      transformShape(selectedShapes, originalShape!.computed.center, 'flipVertically')
    }
    closeContextMenu()
  }

  const onRotateClockwise = () => {
    if (hasSelectedShape) {
      transformShape(selectedShapes, originalShape!.computed.center, 'rotateClockwise')
    }
    closeContextMenu()
  }

  const onRotateCounterclockwise = () => {
    if (hasSelectedShape) {
      transformShape(selectedShapes, originalShape!.computed.center, 'rotateCounterclockwise')
    }
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
      <Button onClick={onPasteShape} disabled={!copiedShape}>
        Paste
      </Button>
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
