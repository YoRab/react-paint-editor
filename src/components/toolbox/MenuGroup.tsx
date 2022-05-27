import _ from 'lodash/fp'
import React, { useEffect, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'
import Tool from './Tool'
import LoadFileTool from './LoadFileTool'
import { exportFileIcon, openFileIcon, pictureIcon, saveIcon } from 'constants/icons'
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
  addPicture: (file: File) => void
  saveFile: () => void
  exportCanvasInFile: () => void
  availableTools: ShapeEnum[]
}

const MenuGroup = ({
  activeTool,
  alignment,
  group,
  vertical = false,
  disabled = false,
  addPicture: addPictureFromProps,
  loadFile: loadFileFromProps,
  saveFile,
  exportCanvasInFile,
  availableTools
}: ToolbarGroupType) => {
  const [isOpen, setIsOpen] = useState(false)

  const loadFile = (file: File) => {
    setIsOpen(false)
    loadFileFromProps(file)
  }

  const addPicture = (file: File) => {
    setIsOpen(false)
    addPictureFromProps(file)
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
            <LoadFileTool
              withText={true}
              disabled={disabled}
              loadFile={addPicture}
              lib="Upload picture..."
              img={pictureIcon}
              accept="image/png, image/gif, image/jpeg"
            />
          )}
          <LoadFileTool
            withText={true}
            disabled={disabled}
            loadFile={loadFile}
            lib="Load file"
            img={openFileIcon}
            accept="application/JSON"
          />

          <Tool
            withText={true}
            disabled={disabled}
            type={ToolEnum.saveFile}
            lib="Save file"
            img={saveIcon}
            isActive={activeTool === ToolEnum.saveFile}
            setActive={saveFile}
          />

          <Tool
            withText={true}
            disabled={disabled}
            type={ToolEnum.export}
            lib="Export"
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
