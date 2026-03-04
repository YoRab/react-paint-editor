import type { UtilsSettings } from '@canvas/constants/app'
import './ContextMenu.css'
import type { SelectionModeContextMenu } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { useEffect, useRef, useState } from 'react'
import useMenu from '@editor/hooks/useMenu'
import { rightChevronIcon } from '@editor/constants/icons'
import { getSelectedShapes } from '@canvas/utils/selection'
import { copyShapes } from '@canvas/utils/shapes'
import { buildShapesGroup } from '@canvas/utils/selection'

const TOOLBAR_SIZE = 36
const BUTTON_HEIGHT = 36
const HR_HEIGHT = 16
const MENU_PADDING_VERTICAL = 8
const MENU_MARGIN = 8
const MENU_WIDTH = 160 + MENU_MARGIN * 2
const SUB_MENU_WIDTH = 200

type ContextMenuType = {
  selectionMode: SelectionModeContextMenu<Point | number>
  settings: UtilsSettings
  canvasRef: React.RefObject<HTMLCanvasElement | null>
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
    ctx: CanvasRenderingContext2D,
    shapes: ShapeEntity[],
    center: Point,
    action: 'flipHorizontally' | 'flipVertically' | 'rotateClockwise' | 'rotateCounterclockwise'
  ) => void
}

const ContextMenu = ({
  moveShapes,
  selectAllShapes,
  selectionMode,
  transformShape,
  settings,
  canvasRef,
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

  const menuHeight =
    MENU_PADDING_VERTICAL * 2 +
    BUTTON_HEIGHT * (2 + (hasSelectedShape ? 8 : 0) + (hasSelectedRemovableAnchor ? 1 : 0)) +
    HR_HEIGHT * (hasSelectedShape ? 3 : 1)

  const [basePosition] = useState<[number, number]>(() => [
    (cursorStartPosition[0] + settings.canvasOffset[0]) * settings.canvasSize.scaleRatio,
    TOOLBAR_SIZE + (cursorStartPosition[1] + settings.canvasOffset[1]) * settings.canvasSize.scaleRatio
  ])

  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number; subMenuPosition: 'left' | 'right' } | undefined>()

  useEffect(() => {
    const canvasRect = canvasRef?.current?.getBoundingClientRect()
    if (!canvasRect) return

    const viewportX = canvasRect.left + basePosition[0]
    const viewportY = canvasRect.top + basePosition[1]
    const clampedX = Math.max(0, Math.min(viewportX, window.innerWidth - MENU_WIDTH)) - canvasRect.left
    const clampedY = Math.max(0, Math.min(viewportY, window.innerHeight - menuHeight)) - canvasRect.top
    const subMenuPosition = clampedX > window.innerWidth - MENU_WIDTH - Math.min(clampedX, SUB_MENU_WIDTH) ? 'left' : 'right'
    setMenuPosition({ x: clampedX, y: clampedY, subMenuPosition })
  }, [canvasRef, basePosition, menuHeight])

  const style = menuPosition
    ? {
        '--react-paint-editor-toolbox-contextmenu-transform': `translate3D(${menuPosition.x}px, ${menuPosition.y}px, 0)`
      }
    : {
        display: 'none'
      }

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
    const ctx = canvasRef?.current?.getContext('2d')
    if (ctx && hasSelectedShape) {
      transformShape(ctx, selectedShapes, originalShape!.computed.center, 'flipHorizontally')
    }
    closeContextMenu()
  }

  const onFlipVertically = () => {
    const ctx = canvasRef?.current?.getContext('2d')
    if (ctx && hasSelectedShape) {
      transformShape(ctx, selectedShapes, originalShape!.computed.center, 'flipVertically')
    }
    closeContextMenu()
  }

  const onRotateClockwise = () => {
    const ctx = canvasRef?.current?.getContext('2d')
    if (ctx && hasSelectedShape) {
      transformShape(ctx, selectedShapes, originalShape!.computed.center, 'rotateClockwise')
    }
    closeContextMenu()
  }

  const onRotateCounterclockwise = () => {
    const ctx = canvasRef?.current?.getContext('2d')
    if (ctx && hasSelectedShape) {
      transformShape(ctx, selectedShapes, originalShape!.computed.center, 'rotateCounterclockwise')
    }
    closeContextMenu()
  }

  const onToggleShapeVisibility = () => {
    if (hasSelectedShape) {
      toggleShapeVisibility(selectedShapes.filter(shape => (isVisible ? shape.visible !== false : shape.visible === false)))
    }
    closeContextMenu()
  }

  const onToggleShapeLock = () => {
    if (hasSelectedShape) {
      toggleShapeLock(selectedShapes.filter(shape => (isLocked ? shape.locked : !shape.locked)))
    }
    closeContextMenu()
  }

  return (
    <Menu className='react-paint-editor-toolbox-contextmenu' style={style}>
      {hasSelectedShape && (
        <>
          {hasSelectedRemovableAnchor && <Button onClick={onDeleteAnchor}>Delete point</Button>}
          <div className='react-paint-editor-toolbox-contextmenu-group' ref={organizeButtonRef}>
            <Button icon={rightChevronIcon}>Organize</Button>
            {isOrganizeMenuOpen && (
              <Menu position={menuPosition?.subMenuPosition}>
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
              <Menu position={menuPosition?.subMenuPosition}>
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
