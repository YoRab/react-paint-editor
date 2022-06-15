import _ from 'lodash/fp'
import React, { useEffect, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'
import Tool from './Tool'
import LoadFileTool from './LoadFileTool'
import {
  clearIcon,
  exportFileIcon,
  openFileIcon,
  pictureIcon,
  publicIcon,
  redoIcon,
  saveIcon,
  undoIcon
} from 'constants/icons'
import { CustomTool } from 'types/tools'
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
  activeTool: React.SetStateAction<ToolsType>
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
  availableTools: CustomTool<ShapeEnum>[]
  togglePictureUrlModal: () => void
  withLoadAndSave: boolean
  withExport: boolean
  hasActionToUndo?: boolean
  hasActionToRedo?: boolean
  hasActionToClear?: boolean
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
  availableTools
}: ToolbarGroupType) => {
  const [isOpen, setIsOpen] = useState(false)

  const loadFile = (file: File) => {
    setIsOpen(false)
    loadFileFromProps(file)
  }

  const addPicture = async (file: File) => {
    setIsOpen(false)
    await addPictureFromProps(file)
  }

  const openPanel = () => {
    setIsOpen(true)
  }

  const isActive = _.includes(activeTool, group?.tools)
  const groupIcon = (isActive ? getShapePicture(activeTool as ShapeEnum) : group.img) ?? group.title

  useEffect(() => {
    if (!isOpen) return

    const closePanel = () => {
      setIsOpen(false)
    }
    const timeoutId = setTimeout(() => {
      //TODO find a better fix than settimeout for react18
      document.addEventListener('click', closePanel)
    }, 0)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', closePanel)
    }
  }, [isOpen])

  const withPicture = _.find({ type: ShapeEnum.picture }, availableTools) !== undefined

  const withMenu = withActionsInMenu || withPicture || withLoadAndSave || withExport

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
                type={ToolEnum.undo}
                disabled={disabled || !hasActionToUndo}
                lib="Undo"
                img={undoIcon}
                isActive={activeTool === ToolEnum.undo}
                setActive={undoAction}
              />
              <Tool
                withText={true}
                type={ToolEnum.redo}
                disabled={disabled || !hasActionToRedo}
                lib="Redo"
                img={redoIcon}
                isActive={activeTool === ToolEnum.redo}
                setActive={redoAction}
              />
              <Tool
                withText={true}
                type={ToolEnum.clear}
                disabled={disabled || !hasActionToClear}
                lib="Clear"
                img={clearIcon}
                isActive={activeTool === ToolEnum.clear}
                setActive={() => clearCanvas()}
              />
              {(withPicture || withLoadAndSave) && <hr />}
            </>
          )}

          {withPicture && (
            <>
              <LoadFileTool
                withText={true}
                disabled={disabled}
                loadFile={addPicture}
                lib="Upload picture"
                img={pictureIcon}
                accept="image/png, image/gif, image/jpeg"
              />
              <Button
                disabled={disabled}
                selected={false}
                onClick={togglePictureUrlModal}
                title="Add picture from URL"
                icon={publicIcon}
                children="Add picture from URL"
              />
              {withLoadAndSave && <hr />}
            </>
          )}

          {withLoadAndSave && (
            <>
              <LoadFileTool
                withText={true}
                disabled={disabled}
                loadFile={loadFile}
                lib="Load project"
                img={openFileIcon}
                accept="application/JSON"
              />

              <Tool
                withText={true}
                disabled={disabled}
                type={ToolEnum.saveFile}
                lib="Save project"
                img={saveIcon}
                isActive={activeTool === ToolEnum.saveFile}
                setActive={saveFile}
              />
            </>
          )}
          {withExport && (
            <Tool
              withText={true}
              disabled={disabled}
              type={ToolEnum.export}
              lib="Export PNG"
              img={exportFileIcon}
              isActive={activeTool === ToolEnum.export}
              setActive={exportCanvasInFile}
            />
          )}
        </StyledPanel>
      )}
    </StyledRelative>
  ) : null
}

export default MenuGroup
