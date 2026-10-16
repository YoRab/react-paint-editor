import Button from '@editor/components/common/Button'
import Menu from '@editor/components/common/Menu'
import { menuIcon, publicIcon } from '@editor/constants/icons'
import { CLEAR_TOOL, EXPORT_TOOL, LOAD_TOOL, REDO_TOOL, SAVE_TOOL, UNDO_TOOL, UPLOAD_PICTURE_TOOL } from '@editor/constants/tools'
import LoadFileTool from './LoadFileTool'
import './MenuGroup.css'
import useMenu from '@editor/hooks/useMenu'
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
  const { ref: menuRef, isOpen, closeMenu } = useMenu()

  const triggerAndCloseMenu =
    <T extends unknown[]>(callback: (...args: T) => void | Promise<void>) =>
    async (...args: T) => {
      await callback(...args)
      closeMenu()
    }

  const withMenu = withActionsInMenu || withUploadPicture || withUrlPicture || withLoadAndSave || withExport

  return withMenu ? (
    <div className='react-paint-editor-toolbox-relative'>
      <div ref={menuRef}>
        <Button title='Menu' disabled={disabled} icon={menuIcon} />
        {isOpen && (
          <Menu alignment='right' position='top'>
            {withActionsInMenu && (
              <>
                <ActionButton withText={true} type={UNDO_TOOL} disabled={disabled || !hasActionToUndo} onClick={triggerAndCloseMenu(undoAction)} />
                <ActionButton withText={true} type={REDO_TOOL} disabled={disabled || !hasActionToRedo} onClick={triggerAndCloseMenu(redoAction)} />
                <ActionButton withText={true} type={CLEAR_TOOL} disabled={disabled || !hasActionToClear} onClick={triggerAndCloseMenu(clearCanvas)} />
                {(withUploadPicture || withUrlPicture || withLoadAndSave) && <hr />}
              </>
            )}

            {withUploadPicture && (
              <LoadFileTool
                withText={true}
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
                  type={LOAD_TOOL}
                  disabled={disabled}
                  loadFile={triggerAndCloseMenu(loadFile)}
                  accept='application/JSON'
                />

                <ActionButton withText={true} disabled={disabled} type={SAVE_TOOL} onClick={triggerAndCloseMenu(saveFile)} />
              </>
            )}
            {withExport && <ActionButton withText={true} disabled={disabled} type={EXPORT_TOOL} onClick={triggerAndCloseMenu(toggleExportModal)} />}
          </Menu>
        )}
      </div>
    </div>
  ) : null
}

export default MenuGroup
