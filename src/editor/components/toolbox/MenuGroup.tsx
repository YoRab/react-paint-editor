import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { menuIcon, publicIcon } from '@editor/constants/icons'
import { CLEAR_TOOL, EXPORT_TOOL, LOAD_TOOL, REDO_TOOL, SAVE_TOOL, UNDO_TOOL, UPLOAD_PICTURE_TOOL } from '@editor/constants/tools'
import LoadFileTool from './LoadFileTool'
import './MenuGroup.css'
import usePopup from '@editor/hooks/usePopup'
import ActionButton from './ActionButton'

type MenuGroupType = {
  withActionsInMenu: boolean
  disabled?: boolean
  loadFile: (file: File) => void
  addPicture: (file: File) => Promise<void>
  saveFile: () => void
  toggleExportModal: () => void
  togglePictureUrlModal: () => void
  withLoadAndSave: boolean
  withExport: boolean
  hasActionToUndo?: boolean
  hasActionToRedo?: boolean
  hasActionToClear?: boolean
  withUploadPicture: boolean
  withUrlPicture: boolean
  undoAction: () => void
  redoAction: () => void
  clearCanvas: () => void
}

const MenuGroup = ({
  withActionsInMenu,
  hasActionToUndo = false,
  hasActionToRedo = false,
  hasActionToClear = false,
  undoAction,
  redoAction,
  clearCanvas,
  disabled = false,
  withLoadAndSave,
  withExport,
  addPicture,
  loadFile,
  togglePictureUrlModal,
  saveFile,
  toggleExportModal,
  withUploadPicture,
  withUrlPicture
}: MenuGroupType) => {
  // the disclosure closes the menu with Escape and Tab, giving the focus back to the button
  const { containerRef, isOpen, setIsOpen, close: closeMenu, triggerRef, panelRef, panelId, triggerProps } = usePopup()
  // The menu closes in the render of a modal opened by its item: the focus goes back to the button of the menu first, where
  // the modal gives it back
  const triggerAndCloseMenu =
    <T extends unknown[]>(callback: (...args: T) => void | Promise<void>) =>
    async (...args: T) => {
      closeMenu()
      await callback(...args)
    }

  const withMenu = withActionsInMenu || withUploadPicture || withUrlPicture || withLoadAndSave || withExport

  return withMenu ? (
    <div className='react-paint-editor-toolbox-relative' ref={containerRef}>
      <Button
        title='Menu'
        disabled={disabled}
        icon={menuIcon}
        aria-haspopup='menu'
        onClick={() => setIsOpen(previous => !previous)}
        {...triggerProps}
      />
      {isOpen && (
        <Menu alignment='right' position='top' label='Menu' id={panelId} menuRef={panelRef} getReturnFocus={() => triggerRef.current}>
          {withActionsInMenu && (
            <>
              <ActionButton
                withText={true}
                role='menuitem'
                type={UNDO_TOOL}
                disabled={disabled || !hasActionToUndo}
                onClick={triggerAndCloseMenu(undoAction)}
              />
              <ActionButton
                withText={true}
                role='menuitem'
                type={REDO_TOOL}
                disabled={disabled || !hasActionToRedo}
                onClick={triggerAndCloseMenu(redoAction)}
              />
              <ActionButton
                withText={true}
                role='menuitem'
                type={CLEAR_TOOL}
                disabled={disabled || !hasActionToClear}
                onClick={triggerAndCloseMenu(clearCanvas)}
              />
              {(withUploadPicture || withUrlPicture || withLoadAndSave) && <hr />}
            </>
          )}

          {withUploadPicture && (
            <LoadFileTool
              withText={true}
              role='menuitem'
              type={UPLOAD_PICTURE_TOOL}
              disabled={disabled}
              loadFile={triggerAndCloseMenu(addPicture)}
              accept='image/png, image/gif, image/jpeg, image/svg+xml, image/webp'
            />
          )}
          {withUrlPicture && (
            <Button
              disabled={disabled}
              selected={false}
              role='menuitem'
              onClick={triggerAndCloseMenu(togglePictureUrlModal)}
              title='Add picture from URL'
              icon={publicIcon}
            >
              Add picture from URL
            </Button>
          )}
          {(withUploadPicture || withUrlPicture) && withLoadAndSave && <hr />}

          {withLoadAndSave && (
            <>
              <LoadFileTool
                withText={true}
                role='menuitem'
                type={LOAD_TOOL}
                disabled={disabled}
                loadFile={triggerAndCloseMenu(loadFile)}
                accept='application/JSON'
              />

              <ActionButton withText={true} role='menuitem' disabled={disabled} type={SAVE_TOOL} onClick={triggerAndCloseMenu(saveFile)} />
            </>
          )}
          {withExport && (
            <ActionButton withText={true} role='menuitem' disabled={disabled} type={EXPORT_TOOL} onClick={triggerAndCloseMenu(toggleExportModal)} />
          )}
        </Menu>
      )}
    </div>
  ) : null
}

export default MenuGroup
