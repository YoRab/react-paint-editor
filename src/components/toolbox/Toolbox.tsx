import _ from 'lodash/fp'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'

import circleIcon from 'assets/icons/circle.svg'
import pictureIcon from 'assets/icons/image.svg'
import selectIcon from 'assets/icons/mouse-pointer.svg'
import redoIcon from 'assets/icons/redo.svg'
import saveIcon from 'assets/icons/save.svg'
import squareIcon from 'assets/icons/square.svg'
import clearIcon from 'assets/icons/times.svg'
import undoIcon from 'assets/icons/undo.svg'

const StyledTool = styled.button<{ selected: boolean }>`
  width: 36px;
  height: 36px;
  display: inline-flex;
  vertical-align: middle;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;

  ${({ selected }) =>
    selected &&
    `
  
  border:1px solid #666;
  
  `}

  &:hover:not(:disabled) {
    background: lightgray;
  }

  &:disabled {
    opacity: 0.25;
    cursor: default;
  }

  input {
    display: none;
  }

  img {
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
    background: #ededed;
  }
`

const StyledToolbox = styled.div<{
  toolboxposition: 'top' | 'left'
  hover: boolean
  ismenuopen: boolean
}>`
  display: flex;
  max-height: 36px;

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
  background: #ededed;
  padding-right: 36px;
`

type ToolType = {
  type: ToolsType
  lib: string
  imgSrc?: string
  isActive: boolean
  isDisabled?: boolean
  setActive: (marker: ToolsType) => void
}

const Tool = ({ type, lib, imgSrc, isActive, isDisabled = false, setActive }: ToolType) => {
  const handleClick = () => {
    setActive(type)
  }

  return (
    <StyledTool disabled={isDisabled} selected={isActive} onClick={handleClick}>
      {imgSrc ? <img src={imgSrc} /> : lib}
    </StyledTool>
  )
}

type LoadFileToolType = {
  loadFile: (file: File) => void
  lib: string
  imgSrc?: string
  accept: string
}

const LoadFileTool = ({ loadFile, lib, imgSrc, accept }: LoadFileToolType) => {
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
      {imgSrc ? <img src={imgSrc} /> : lib}
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
  const toolsTypes: { shape: ShapeEnum; img?: string }[] = [
    { shape: ShapeEnum.brush },
    { shape: ShapeEnum.line },
    { shape: ShapeEnum.polygon },
    { shape: ShapeEnum.rect, img: squareIcon },
    { shape: ShapeEnum.circle, img: circleIcon },
    { shape: ShapeEnum.ellipse },
    { shape: ShapeEnum.text }
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
        imgSrc={selectIcon}
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
        imgSrc={undoIcon}
        isActive={activeTool === ToolEnum.undo}
        setActive={undoAction}
      />
      <Tool
        type={ToolEnum.redo}
        isDisabled={!hasActionToRedo}
        lib="Redo"
        imgSrc={redoIcon}
        isActive={activeTool === ToolEnum.redo}
        setActive={redoAction}
      />
      <Tool
        type={ToolEnum.clear}
        isDisabled={!hasActionToClear}
        lib="Clear"
        imgSrc={clearIcon}
        isActive={activeTool === ToolEnum.clear}
        setActive={() => clearCanvas()}
      />
      <StyledShrinkableTools>
        <StyledShrinkableToolsInner>
          {_.map(
            toolType => (
              <Tool
                key={toolType.shape}
                type={toolType.shape}
                lib={toolType.shape}
                imgSrc={toolType.img}
                isActive={activeTool === toolType.shape}
                setActive={setActiveTool}
              />
            ),
            toolsTypes
          )}
          <LoadFileTool
            loadFile={addPicture}
            lib="Image"
            imgSrc={pictureIcon}
            accept="image/png, image/gif, image/jpeg"
          />
        </StyledShrinkableToolsInner>
        <StyledTool disabled={false} selected={false} onClick={toggleTools}>
          Menu
        </StyledTool>
      </StyledShrinkableTools>

      <LoadFileTool loadFile={loadFile} lib="Load file" accept="application/JSON" />

      <Tool
        type={ToolEnum.saveFile}
        lib="Save file"
        isActive={activeTool === ToolEnum.saveFile}
        setActive={saveFile}
      />

      <Tool
        type={ToolEnum.export}
        lib="Export"
        imgSrc={saveIcon}
        isActive={activeTool === ToolEnum.export}
        setActive={exportCanvasInFile}
      />
    </StyledToolbox>
  )
}

export default Toolbox
