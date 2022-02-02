import {  clearIcon, dotsIcon, exportFileIcon, openFileIcon, pictureIcon, redoIcon, saveIcon, selectIcon, undoIcon } from 'constants/icons'
import _ from 'lodash/fp'
import React, {  useRef, useState } from 'react'
import styled from 'styled-components'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'

const StyledTool = styled.button<{ selected: boolean }>`
  width: 36px;
  height: 36px;

  color: var(--text-color);
  display: inline-flex;
  vertical-align: middle;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;

  ${({ selected }) =>
    selected ?
    `
  
    color:var(--text-color-selected);
    background:var(--bg-color-selected);

  
  ` : `
  &:hover:not(:disabled) {
    background: var(--btn-hover);
  }
  `}



  &:disabled {
    opacity: 0.25;
    cursor: default;
  }

  input {
    display: none;
  }

  svg {
    color: inherit;
    width: 16px;
    height: 16px;
  }
`

const StyledShrinkableTools = styled.div`
  flex: 1;
  position: relative;
  height: 100%;
  text-align: center;

  max-height: 72px;

  & > ${StyledTool} {
    position: absolute;
    right: 0;
    bottom: 36px;
  }
`

const StyledToolbox = styled.div<{
  toolboxposition: 'top' | 'left'
  hover: boolean
  ismenuopen: boolean
}>`
  display: flex;
  max-height: 36px;
  background: var(--bg-color);

  z-index: 1;

  ${({ ismenuopen }) =>
    !ismenuopen &&
    `
    overflow: hidden;
  
  `}

  ${({ hover }) =>
    hover &&
    `
    position:absolute;
  `}
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'row' : 'column')};
`

const StyledShrinkableToolsInner = styled.div`
  display: inline-block;
  text-align: left;
  background: var(--bg-color);
  margin-right: 36px;
  text-align:right;
`

type ToolType = {
  type: ToolsType
  lib: string
  img?: string
  isActive: boolean
  isDisabled?: boolean
  setActive: (marker: ToolsType) => void
}

const Tool = ({ type, lib, img, isActive, isDisabled = false, setActive }: ToolType) => {
  const handleClick = () => {
    setActive(type)
  }

  return (
    <StyledTool disabled={isDisabled} selected={isActive} onClick={handleClick} dangerouslySetInnerHTML={{__html: img?img:lib}}>
    </StyledTool>
  )
}

type LoadFileToolType = {
  loadFile: (file: File) => void
  lib: string
  img?: string
  accept: string
}

const LoadFileTool = ({ loadFile, lib, img, accept }: LoadFileToolType) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0)
    if (!file) return
    loadFile(file)
  }

  return (
    <StyledTool as="label" selected={false}>
      <input
        ref={inputRef}
        type="file"
        onClick={handleClick}
        onChange={handleChange}
        accept={accept}
      />
      {img ? <span  dangerouslySetInnerHTML={{__html: img}} /> : lib}
    </StyledTool>
  )
}

type ToolboxType = {
  activeTool: React.SetStateAction<ToolsType>
  hasActionToUndo?: boolean
  hasActionToRedo?: boolean
  hasActionToClear?: boolean
  undoAction: () => void
  redoAction: () => void
  clearCanvas: () => void
  setActiveTool: (tool: ToolsType) => void
  loadFile: (file: File) => void
  addPicture: (file: File) => void
  saveFile: () => void
  exportCanvasInFile: () => void
  toolboxPosition: 'top' | 'left'
  hover: boolean
}

const Toolbox = ({
  activeTool,
  hasActionToUndo = false,
  hasActionToRedo = false,
  hasActionToClear = false,
  clearCanvas,
  setActiveTool,
  undoAction,
  redoAction,
  addPicture,
  loadFile,
  saveFile,
  exportCanvasInFile,
  toolboxPosition,
  hover
}: ToolboxType) => {
  const toolsTypes:ShapeEnum[] = [
     ShapeEnum.brush, ShapeEnum.line, ShapeEnum.polygon, ShapeEnum.rect, ShapeEnum.circle,  ShapeEnum.ellipse,ShapeEnum.text
  ]

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  return (
    <StyledToolbox toolboxposition={toolboxPosition} hover={hover} ismenuopen={isMenuOpen}>
      <Tool
        type={ToolEnum.selection}
        lib="selection"
        img={selectIcon}
        isActive={activeTool === ToolEnum.selection}
        setActive={setActiveTool}
      />
      {/* <Tool
        type={ToolEnum.move}
        lib="move"
        imgSrc={moveIcon}
        isActive={activeTool === ToolEnum.move}
        setActive={setActiveTool}
      /> */}
      <Tool
        type={ToolEnum.undo}
        isDisabled={!hasActionToUndo}
        lib="Undo"
        img={undoIcon}
        isActive={activeTool === ToolEnum.undo}
        setActive={undoAction}
      />
      <Tool
        type={ToolEnum.redo}
        isDisabled={!hasActionToRedo}
        lib="Redo"
        img={redoIcon}
        isActive={activeTool === ToolEnum.redo}
        setActive={redoAction}
      />
      <Tool
        type={ToolEnum.clear}
        isDisabled={!hasActionToClear}
        lib="Clear"
        img={clearIcon}
        isActive={activeTool === ToolEnum.clear}
        setActive={() => clearCanvas()}
      />
      <StyledShrinkableTools>
        <StyledShrinkableToolsInner>
          {_.map(
            toolType => (
              <Tool
                key={toolType}
                type={toolType}
                lib={toolType}
                img={getShapePicture(toolType)}
                isActive={activeTool === toolType}
                setActive={setActiveTool}
              />
            ),
            toolsTypes
          )}
          <LoadFileTool
            loadFile={addPicture}
            lib="Image"
            img={pictureIcon}
            accept="image/png, image/gif, image/jpeg"
          />
        </StyledShrinkableToolsInner>
        <StyledTool disabled={false} selected={false} onClick={toggleTools}  dangerouslySetInnerHTML={{__html: dotsIcon}}>
        </StyledTool>
      </StyledShrinkableTools>

      <LoadFileTool loadFile={loadFile} lib="Load file" img={openFileIcon} accept="application/JSON" />

      <Tool
        type={ToolEnum.saveFile}
        lib="Save file"
        img={saveIcon}
        isActive={activeTool === ToolEnum.saveFile}
        setActive={saveFile}
      />

      <Tool
        type={ToolEnum.export}
        lib="Export"
        img={exportFileIcon}
        isActive={activeTool === ToolEnum.export}
        setActive={exportCanvasInFile}
      />

    </StyledToolbox>
  )
}

export default Toolbox
