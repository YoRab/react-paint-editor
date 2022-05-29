import _ from 'lodash/fp'
import React, { useEffect, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'
import Tool from './Tool'
import LoadFileTool from './LoadFileTool'
import { exportFileIcon, openFileIcon, pictureIcon, publicIcon, saveIcon } from 'constants/icons'
const StyledPanel = styled(Panel)`
  display: flex;
  bottom: unset;
  top: 100%;

  &[data-vertical='1'] {
    flex-direction: column;
  }

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid var(--text-color);
  }
`

const StyledRelative = styled.div`
  position: relative;
  display: inline-block;
`

type ToolbarGroupType = {
  activeTool: React.SetStateAction<ToolsType>
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
  availableTools: ShapeEnum[]
  togglePictureUrlModal: () => void
}

const MenuGroup = ({
  activeTool,
  alignment,
  group,
  vertical = false,
  disabled = false,
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

    document.addEventListener('click', closePanel)

    return () => {
      document.removeEventListener('click', closePanel)
    }
  }, [isOpen])

  return (
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
          {_.includes(ShapeEnum.picture, availableTools) && (
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
              <hr />
            </>
          )}

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

          <Tool
            withText={true}
            disabled={disabled}
            type={ToolEnum.export}
            lib="Export PNG"
            img={exportFileIcon}
            isActive={activeTool === ToolEnum.export}
            setActive={exportCanvasInFile}
          />
        </StyledPanel>
      )}
    </StyledRelative>
  )
}

export default MenuGroup
