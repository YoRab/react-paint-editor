import type { ShapeType } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { publicIcon } from '@editor/constants/icons'
import { CLEAR_TOOL, EXPORT_TOOL, LOAD_TOOL, REDO_TOOL, SAVE_TOOL, UNDO_TOOL, UPLOAD_PICTURE_TOOL } from '@editor/constants/tools'
import React, { useEffect, useState, useTransition } from 'react'
import LoadFileTool from './LoadFileTool'
import './MenuGroup.css'
import Tool from './Tool'

type ToolbarGroupType = {
  activeTool: ToolsType
  withActionsInMenu: boolean
  group: {
    tools?: ShapeType[]
    title: string
    img: string
  }
  vertical?: boolean
  alignment?: 'left' | 'center' | 'right'
  title?: string
  disabled?: boolean
  img?: string
  loadFile: (file: File) => void
  addPicture: (file: File) => Promise<void>
  saveFile: () => void
  exportCanvasInFile: () => void
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
  activeTool,
  withActionsInMenu,
  hasActionToUndo = false,
  hasActionToRedo = false,
  hasActionToClear = false,
  undoAction,
  redoAction,
  clearCanvas,
  alignment,
  group,
  vertical = false,
  disabled = false,
  withLoadAndSave,
  withExport,
  addPicture: addPictureFromProps,
  loadFile: loadFileFromProps,
  togglePictureUrlModal,
  saveFile,
  exportCanvasInFile,
  withUploadPicture,
  withUrlPicture
}: ToolbarGroupType) => {
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()

  const loadFile = (file: File) => {
    setIsOpen(false)
    loadFileFromProps(file)
  }

  const addPicture = async (file: File) => {
    setIsOpen(false)
    await addPictureFromProps(file)
  }

  const openPanel = () => {
    startTransition(() => {
      setIsOpen(true)
    })
  }

  const isActive = group?.tools?.some(tool => tool === activeTool.type)

  const groupIcon = (isActive ? activeTool.icon : group.img) ?? group.title

  useEffect(() => {
    if (!isOpen) return

    const closePanel = () => {
      setIsOpen(false)
    }
    document.addEventListener('click', closePanel)
    return () => {
      document.removeEventListener('click', closePanel)
    }
  }, [isOpen])

  const withMenu = withActionsInMenu || withUploadPicture || withUrlPicture || withLoadAndSave || withExport

  return withMenu ? (
    <div className='react-paint-editor-toolbox-relative'>
      <Button selected={isActive} title={group.title} disabled={disabled} onClick={openPanel} icon={groupIcon} />
      {isOpen && (
        <Panel alignment={alignment} position='top'>
          <div className='react-paint-editor-toolbox-panel-content' data-vertical={+vertical}>
            {withActionsInMenu && (
              <>
                <Tool
                  withText={true}
                  type={UNDO_TOOL}
                  disabled={disabled || !hasActionToUndo}
                  img={UNDO_TOOL.icon}
                  isActive={activeTool.id === UNDO_TOOL.id}
                  setActive={undoAction}
                />
                <Tool
                  withText={true}
                  type={REDO_TOOL}
                  disabled={disabled || !hasActionToRedo}
                  img={REDO_TOOL.icon}
                  isActive={activeTool.id === REDO_TOOL.id}
                  setActive={redoAction}
                />
                <Tool
                  withText={true}
                  type={CLEAR_TOOL}
                  disabled={disabled || !hasActionToClear}
                  img={CLEAR_TOOL.icon}
                  isActive={activeTool.id === CLEAR_TOOL.id}
                  setActive={clearCanvas}
                />
                {(withUploadPicture || withUrlPicture || withLoadAndSave) && <hr />}
              </>
            )}

            {withUploadPicture && (
              <LoadFileTool
                withText={true}
                type={UPLOAD_PICTURE_TOOL}
                disabled={disabled}
                loadFile={addPicture}
                img={UPLOAD_PICTURE_TOOL.icon}
                accept='image/png, image/gif, image/jpeg, image/svg+xml'
              />
            )}
            {withUrlPicture && (
              <Button disabled={disabled} selected={false} onClick={togglePictureUrlModal} title='Add picture from URL' icon={publicIcon}>
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
                  loadFile={loadFile}
                  img={LOAD_TOOL.icon}
                  accept='application/JSON'
                />

                <Tool
                  withText={true}
                  disabled={disabled}
                  type={SAVE_TOOL}
                  img={SAVE_TOOL.icon}
                  isActive={activeTool.id === SAVE_TOOL.id}
                  setActive={saveFile}
                />
              </>
            )}
            {withExport && (
              <Tool
                withText={true}
                disabled={disabled}
                type={EXPORT_TOOL}
                img={EXPORT_TOOL.icon}
                isActive={activeTool.id === EXPORT_TOOL.id}
                setActive={exportCanvasInFile}
              />
            )}
          </div>
        </Panel>
      )}
    </div>
  ) : null
}

export default MenuGroup
