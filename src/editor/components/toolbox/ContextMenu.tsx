import { type ContextMenuState, type EditorActions, type ShapesOrderAction, type ShapesTransformAction, usePaint, usePaintState } from '@canvas/index'
import { clamp } from '@editor/utils/util'
import './ContextMenu.css'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { rightChevronIcon } from '@editor/constants/icons'
import useMenu from '@editor/hooks/useMenu'
import { type RefObject, useEffect, useState } from 'react'

const BUTTON_HEIGHT = 36
const HR_HEIGHT = 16
const MENU_PADDING_VERTICAL = 8
const MENU_MARGIN = 8
const MENU_WIDTH = 160 + MENU_MARGIN * 2
const SUB_MENU_WIDTH = 200

type ContextMenuContentType = {
  contextMenu: ContextMenuState
  containerRef: RefObject<HTMLElement | null>
  hasCopiedShapes: boolean
  actions: EditorActions
}

const ContextMenuContent = ({ contextMenu, containerRef, hasCopiedShapes, actions }: ContextMenuContentType) => {
  const { shapes: selectedShapes, anchorIndex, canRemoveAnchor, clientPosition } = contextMenu
  const selectedIds = selectedShapes.map(shape => shape.id)
  const hasSelectedShape = selectedShapes.length > 0
  const firstShape = selectedShapes[0]

  const isVisible = !selectedShapes.some(shape => shape.visible === false)
  const isLocked = selectedShapes.some(shape => shape.locked)
  const { ref: organizeMenuRef, isOpen: isOrganizeMenuOpen } = useMenu({ trigger: 'hover' })
  const { ref: transformMenuRef, isOpen: isTransformMenuOpen } = useMenu({ trigger: 'hover', disabled: isLocked })

  const menuHeight =
    MENU_PADDING_VERTICAL * 2 + BUTTON_HEIGHT * (2 + (hasSelectedShape ? 8 : 0) + (canRemoveAnchor ? 1 : 0)) + HR_HEIGHT * (hasSelectedShape ? 3 : 1)

  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number; subMenuPosition: 'left' | 'right' } | undefined>()

  useEffect(() => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    const viewportX = clamp(clientPosition.x, 0, window.innerWidth - MENU_WIDTH)
    const viewportY = clamp(clientPosition.y, 0, window.innerHeight - menuHeight)
    const subMenuPosition = viewportX + MENU_WIDTH + SUB_MENU_WIDTH > window.innerWidth ? 'left' : 'right'
    setMenuPosition({ x: viewportX - containerRect.left, y: viewportY - containerRect.top, subMenuPosition })
  }, [containerRef, clientPosition.x, clientPosition.y, menuHeight])

  const style = menuPosition
    ? {
        '--react-paint-editor-toolbox-contextmenu-transform': `translate3D(${menuPosition.x}px, ${menuPosition.y}px, 0)`
      }
    : {
        display: 'none'
      }

  const runAndClose = (callback: () => void) => () => {
    callback()
    actions.closeContextMenu()
  }

  const onDeleteAnchor = runAndClose(() => {
    if (firstShape && anchorIndex !== undefined) actions.removeShapePoint(firstShape.id, anchorIndex)
  })

  const onRemoveShape = runAndClose(() => actions.removeShapes(selectedIds))

  const onSelectAllShapes = runAndClose(actions.selectAllShapes)

  const onDuplicateShape = runAndClose(() => actions.duplicateShapes(selectedIds, { translate: true, select: true }))

  const onCutShape = runAndClose(() => actions.cut(selectedIds))

  const onCopyShape = runAndClose(() => actions.copy(selectedIds))

  const onPasteShape = runAndClose(actions.paste)

  const onMoveShapes = (action: ShapesOrderAction) => runAndClose(() => actions.moveShapes(selectedIds, action))

  const onTransformShapes = (action: ShapesTransformAction) => runAndClose(() => actions.transformShapes(selectedIds, action))

  const onToggleShapeVisibility = runAndClose(() => actions.setShapesVisibility(selectedIds, !isVisible))

  const onToggleShapeLock = runAndClose(() => actions.setShapesLocked(selectedIds, !isLocked))

  return (
    <Menu className='react-paint-editor-toolbox-contextmenu' style={style}>
      {hasSelectedShape && (
        <>
          {canRemoveAnchor && <Button onClick={onDeleteAnchor}>Delete point</Button>}
          <div className='react-paint-editor-toolbox-contextmenu-group' ref={organizeMenuRef}>
            <Button icon={rightChevronIcon}>Organize</Button>
            {isOrganizeMenuOpen && (
              <Menu position={menuPosition?.subMenuPosition}>
                <Button onClick={onMoveShapes('forward')}>Move forward</Button>
                <Button onClick={onMoveShapes('first')}>Put on first</Button>
                <Button onClick={onMoveShapes('backward')}>Move backward</Button>
                <Button onClick={onMoveShapes('last')}>Put on last</Button>
              </Menu>
            )}
          </div>
          <div className='react-paint-editor-toolbox-contextmenu-group' ref={transformMenuRef}>
            <Button icon={rightChevronIcon} disabled={isLocked}>
              Transform
            </Button>
            {isTransformMenuOpen && (
              <Menu position={menuPosition?.subMenuPosition}>
                <Button onClick={onTransformShapes('flipHorizontally')}>Flip horizontally</Button>
                <Button onClick={onTransformShapes('flipVertically')}>Flip vertically</Button>
                <Button onClick={onTransformShapes('rotateClockwise')}>Rotate clockwise</Button>
                <Button onClick={onTransformShapes('rotateCounterclockwise')}>Rotate counterclockwise</Button>
              </Menu>
            )}
          </div>
          <hr />
          <Button onClick={onCutShape}>Cut</Button>
          <Button onClick={onCopyShape}>Copy</Button>
        </>
      )}
      <Button onClick={onPasteShape} disabled={!hasCopiedShapes}>
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

/** Context menu of the canvas, shown when the canvas opens it */
const ContextMenu = ({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) => {
  const paint = usePaint()
  const contextMenu = usePaintState(paint, state => state.contextMenu)
  const hasCopiedShapes = usePaintState(paint, state => state.clipboard.hasContent)

  return contextMenu ? (
    <ContextMenuContent contextMenu={contextMenu} containerRef={containerRef} hasCopiedShapes={hasCopiedShapes} actions={paint.actions} />
  ) : null
}

export default ContextMenu
