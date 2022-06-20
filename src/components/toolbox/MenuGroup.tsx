import _ from 'lodash/fp'
import React, { useEffect, useState, useTransition } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum } from 'types/Shapes'
import Tool from './Tool'
import LoadFileTool from './LoadFileTool'
import { publicIcon } from 'constants/icons'
import { ToolsType } from 'types/tools'
import {
  CLEAR_TOOL,
  EXPORT_TOOL,
  LOAD_TOOL,
  REDO_TOOL,
  SAVE_TOOL,
  UNDO_TOOL,
  UPLOAD_PICTURE_TOOL
} from 'constants/tools'
const StyledPanel = styled(Panel)`
  display: flex;
  bottom: unset;
  top: 100%;

  &[data-vertical='1'] {
    flex-direction: column;
  }
`

const StyledRelative = styled.div`
  position: relative;
  display: inline-block;
`

type ToolbarGroupType = {
  activeTool: ToolsType
  withActionsInMenu: boolean
  group: {
    tools?: ShapeEnum[]
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

  const isActive = _.includes(activeTool.type, group?.tools)
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

  const withMenu =
    withActionsInMenu || withUploadPicture || withUrlPicture || withLoadAndSave || withExport

  return withMenu ? (
    <StyledRelative>
      <Button
        selected={isActive}
        title={group.title}
        disabled={disabled}
        onClick={openPanel}
        icon={groupIcon}
      />
      {isOpen && (
        <StyledPanel vertical={vertical} alignment={alignment}>
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
              accept="image/png, image/gif, image/jpeg"
            />
          )}
          {withUrlPicture && (
            <Button
              disabled={disabled}
              selected={false}
              onClick={togglePictureUrlModal}
              title="Add picture from URL"
              icon={publicIcon}
              children="Add picture from URL"
            />
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
                accept="application/JSON"
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
        </StyledPanel>
      )}
    </StyledRelative>
  ) : null
}

export default MenuGroup
