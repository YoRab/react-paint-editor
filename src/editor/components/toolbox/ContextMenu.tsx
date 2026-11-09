import {
  CANVAS_SHORTCUTS,
  type ContextMenuState,
  type EditorActions,
  getAriaKeyShortcut,
  type ShapesOrderAction,
  type ShapesTransformAction,
  type Shortcut,
  usePaint,
  usePaintState
} from '@canvas/index'
import { clamp, isMacOs } from '@editor/utils/util'
import './ContextMenu.css'
import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import ShortcutHint from '@editor/components/common/ShortcutHint'
import { rightChevronIcon } from '@editor/constants/icons'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import useMenu from '@editor/hooks/useMenu'
import usePressOutside from '@editor/hooks/usePressOutside'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import PropertiesModal from './PropertiesModal'

const BUTTON_HEIGHT = 36
// a border of 1 pixel between margins of 8
const HR_HEIGHT = 17
const MENU_PADDING_VERTICAL = 8
const MENU_MARGIN = 8
// the width of the menu holds the shortcuts at the end of its items, like the one of its sub menus
const MENU_WIDTH = 220 + MENU_MARGIN * 2
const SUB_MENU_WIDTH = 260

type ItemType = { onClick: () => void; disabled?: boolean; shortcut?: Shortcut; children: ReactNode }

const Item = ({ onClick, disabled, shortcut, children }: ItemType) => (
  <Button role='menuitem' onClick={onClick} disabled={disabled} aria-keyshortcuts={shortcut ? getAriaKeyShortcut(shortcut, isMacOs()) : undefined}>
    {children}
    {shortcut && <ShortcutHint shortcut={shortcut} />}
  </Button>
)

type SubmenuItemType = {
  menu: ReturnType<typeof useMenu>
  label: string
  disabled?: boolean
  position: 'left' | 'right' | undefined
  children: ReactNode
}

/** An item opening its sub menu: by the hover, a click, Enter or ArrowRight */
const SubmenuItem = ({ menu, label, disabled, position, children }: SubmenuItemType) => (
  <div className='react-paint-editor-toolbox-contextmenu-group' ref={menu.ref}>
    <Button role='menuitem' icon={rightChevronIcon} disabled={disabled} aria-haspopup='menu' aria-expanded={menu.isOpen} onClick={menu.openMenu}>
      {label}
    </Button>
    {menu.isOpen && (
      <Menu position={position} label={label} onClose={menu.closeMenu} isSubmenu>
        {children}
      </Menu>
    )}
  </div>
)

type ContextMenuContentType = {
  contextMenu: ContextMenuState
  containerRef: RefObject<HTMLElement | null>
  hasCopiedShapes: boolean
  actions: EditorActions
  /** Opens the modal of the properties of the selection, which stays once the menu is closed */
  openProperties: () => void
}

const ContextMenuContent = ({ contextMenu, containerRef, hasCopiedShapes, actions, openProperties }: ContextMenuContentType) => {
  const { shapes: selectedShapes, anchorIndex, canRemoveAnchor, canGroup, canUngroup, clientPosition } = contextMenu
  const selectedIds = selectedShapes.map(shape => shape.id)
  const hasSelectedShape = selectedShapes.length > 0
  const firstShape = selectedShapes[0]

  const isVisible = !selectedShapes.some(shape => shape.visible === false)
  const isLocked = selectedShapes.some(shape => shape.locked)
  const organizeMenu = useMenu()
  const { editor } = useEditorLocale()
  const m = editor.contextMenu
  const transformMenu = useMenu({ disabled: isLocked })

  const menuHeight =
    MENU_PADDING_VERTICAL * 2 + BUTTON_HEIGHT * (2 + (hasSelectedShape ? 11 : 0) + (canRemoveAnchor ? 1 : 0)) + HR_HEIGHT * (hasSelectedShape ? 4 : 1)

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

  // a gesture started on the canvas has already closed the menu, closing it again does nothing
  const menuRef = useRef<HTMLDivElement | null>(null)
  usePressOutside(menuRef, actions.closeContextMenu)

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

  const onGroupShapes = runAndClose(() => actions.groupShapes(selectedIds))

  const onUngroupShapes = runAndClose(() => actions.ungroupShapes(selectedIds))

  const onCutShape = runAndClose(() => actions.cut(selectedIds))

  const onCopyShape = runAndClose(() => actions.copy(selectedIds))

  const onPasteShape = runAndClose(actions.paste)

  const onOpenProperties = runAndClose(openProperties)

  const onMoveShapes = (action: ShapesOrderAction) => runAndClose(() => actions.moveShapes(selectedIds, action))

  const onTransformShapes = (action: ShapesTransformAction) => runAndClose(() => actions.transformShapes(selectedIds, action))

  const onToggleShapeVisibility = runAndClose(() => actions.setShapesVisibility(selectedIds, !isVisible))

  const onToggleShapeLock = runAndClose(() => actions.setShapesLocked(selectedIds, !isLocked))

  return (
    <Menu
      className='react-paint-editor-toolbox-contextmenu'
      style={style}
      menuRef={menuRef}
      label={m.menu}
      onClose={actions.closeContextMenu}
      // the menu is hidden until it is placed: it takes the focus once shown
      autoFocus={menuPosition !== undefined}
    >
      {hasSelectedShape && (
        <>
          {canRemoveAnchor && <Item onClick={onDeleteAnchor}>{m.removePoint}</Item>}
          <SubmenuItem menu={organizeMenu} label={m.organize} position={menuPosition?.subMenuPosition}>
            <Item onClick={onMoveShapes('forward')} shortcut={CANVAS_SHORTCUTS.forward}>
              {m.bringForward}
            </Item>
            <Item onClick={onMoveShapes('first')} shortcut={CANVAS_SHORTCUTS.first}>
              {m.bringToFront}
            </Item>
            <Item onClick={onMoveShapes('backward')} shortcut={CANVAS_SHORTCUTS.backward}>
              {m.sendBackward}
            </Item>
            <Item onClick={onMoveShapes('last')} shortcut={CANVAS_SHORTCUTS.last}>
              {m.sendToBack}
            </Item>
          </SubmenuItem>
          <SubmenuItem menu={transformMenu} label={m.transform} disabled={isLocked} position={menuPosition?.subMenuPosition}>
            <Item onClick={onTransformShapes('flipHorizontally')} shortcut={CANVAS_SHORTCUTS.flipHorizontally}>
              {m.flipHorizontally}
            </Item>
            <Item onClick={onTransformShapes('flipVertically')} shortcut={CANVAS_SHORTCUTS.flipVertically}>
              {m.flipVertically}
            </Item>
            <Item onClick={onTransformShapes('rotateClockwise')}>{m.rotateClockwise}</Item>
            <Item onClick={onTransformShapes('rotateCounterclockwise')}>{m.rotateCounterclockwise}</Item>
          </SubmenuItem>
          <hr />
          <Item onClick={onCutShape} shortcut={CANVAS_SHORTCUTS.cut}>
            {m.cut}
          </Item>
          <Item onClick={onCopyShape} shortcut={CANVAS_SHORTCUTS.copy}>
            {m.copy}
          </Item>
        </>
      )}
      <Item onClick={onPasteShape} disabled={!hasCopiedShapes} shortcut={CANVAS_SHORTCUTS.paste}>
        {m.paste}
      </Item>
      <hr />
      {hasSelectedShape && (
        <>
          <Item onClick={onDuplicateShape} shortcut={CANVAS_SHORTCUTS.duplicate}>
            {m.duplicate}
          </Item>
          <Item onClick={onGroupShapes} disabled={!canGroup} shortcut={CANVAS_SHORTCUTS.group}>
            {m.group}
          </Item>
          <Item onClick={onUngroupShapes} disabled={!canUngroup} shortcut={CANVAS_SHORTCUTS.ungroup}>
            {m.ungroup}
          </Item>
          <Item onClick={onToggleShapeVisibility} shortcut={CANVAS_SHORTCUTS.hide}>
            {isVisible ? m.hide : m.show}
          </Item>
          <Item onClick={onToggleShapeLock} shortcut={CANVAS_SHORTCUTS.lock}>
            {isLocked ? m.unlock : m.lock}
          </Item>
          <Item onClick={onRemoveShape} shortcut={CANVAS_SHORTCUTS.remove}>
            {m.remove}
          </Item>
          <hr />
        </>
      )}
      <Item onClick={onSelectAllShapes} shortcut={CANVAS_SHORTCUTS.selectAll}>
        {m.selectAll}
      </Item>
      {hasSelectedShape && (
        <>
          <hr />
          <Item onClick={onOpenProperties} disabled={isLocked}>
            {m.properties}
          </Item>
        </>
      )}
    </Menu>
  )
}

/** Context menu of the canvas, shown when the canvas opens it, and the modal of the properties it opens */
const ContextMenu = ({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) => {
  const paint = usePaint()
  const contextMenu = usePaintState(paint, state => state.contextMenu)
  const hasCopiedShapes = usePaintState(paint, state => state.clipboard.hasContent)
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false)

  return (
    <>
      {contextMenu && (
        <ContextMenuContent
          contextMenu={contextMenu}
          containerRef={containerRef}
          hasCopiedShapes={hasCopiedShapes}
          actions={paint.actions}
          openProperties={() => setIsPropertiesOpen(true)}
        />
      )}
      {isPropertiesOpen && <PropertiesModal onClose={() => setIsPropertiesOpen(false)} />}
    </>
  )
}

export default ContextMenu
