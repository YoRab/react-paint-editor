import _ from 'lodash/fp'
import React, { useCallback, useRef } from 'react'
import styled from 'styled-components'
import { DrawableShape, ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { createPicture } from 'utils/selection'

import circleIcon from 'assets/icons/circle.svg'
import pictureIcon from 'assets/icons/image.svg'
import selectIcon from 'assets/icons/mouse-pointer.svg'
import redoIcon from 'assets/icons/redo.svg'
import saveIcon from 'assets/icons/save.svg'
import squareIcon from 'assets/icons/square.svg'
import clearIcon from 'assets/icons/times.svg'
import undoIcon from 'assets/icons/undo.svg'

const StyledToolbox = styled.div<{
  toolboxposition: 'top' | 'left'
  hover: boolean
}>`
  display: flex;
  border: 1px solid black;

  ${({ hover }) =>
    hover &&
    `
    position:absolute;
  `}
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'row' : 'column')};
`

const StyledTool = styled.button<{ selected: boolean }>`
  width: 36px;
  height: 36px;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;

  ${({ selected }) =>
    selected &&
    `
  
  border:1px solid black;
  
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

const StyledSeparator = styled.div`
  flex: 1;
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
  const handleClick = useCallback(() => {
    setActive(type)
  }, [type, setActive])

  return (
    <StyledTool disabled={isDisabled} selected={isActive} onClick={handleClick}>
      {imgSrc ? <img src={imgSrc} /> : lib}
    </StyledTool>
  )
}

type PictureToolType = {
  addShape: (pictureShape: DrawableShape) => void
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  setActiveTool: (tool: ToolsType) => void
  maxPictureSize: number
}

const PictureTool = ({
  addShape,
  setSelectedShape,
  setActiveTool,
  maxPictureSize
}: PictureToolType) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.item(0)
      if (!file) return
      const pictureShape = await createPicture(file, maxPictureSize)
      addShape(pictureShape)
      setActiveTool(ToolEnum.selection)
      setSelectedShape(pictureShape)
    },
    [maxPictureSize, addShape, setActiveTool, setSelectedShape]
  )

  return (
    <StyledTool as="label" selected={false}>
      <input
        ref={inputRef}
        type="file"
        onClick={handleClick}
        onChange={handleChange}
        accept="image/png, image/gif, image/jpeg"
      />

      <img src={pictureIcon} />
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
  saveCanvasInFile: () => void
  addShape: (pictureShape: DrawableShape) => void
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  maxPictureSize?: number
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
  addShape,
  saveCanvasInFile,
  setSelectedShape,
  maxPictureSize = 300,
  toolboxPosition,
  hover
}: ToolboxType) => {
  const toolsTypes: { shape: ShapeEnum; img?: string }[] = [
    { shape: ShapeEnum.rect, img: squareIcon },
    { shape: ShapeEnum.circle, img: circleIcon },
    { shape: ShapeEnum.ellipse }
  ]

  return (
    <StyledToolbox toolboxposition={toolboxPosition} hover={hover}>
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
        setActive={clearCanvas}
      />
      <StyledSeparator />
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
      <PictureTool
        maxPictureSize={maxPictureSize}
        setSelectedShape={setSelectedShape}
        setActiveTool={setActiveTool}
        addShape={addShape}
      />
      <StyledSeparator />

      <Tool
        type={ToolEnum.save}
        lib="Save"
        imgSrc={saveIcon}
        isActive={activeTool === ToolEnum.save}
        setActive={saveCanvasInFile}
      />
    </StyledToolbox>
  )
}

export default Toolbox
