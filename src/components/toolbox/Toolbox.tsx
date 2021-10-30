import _ from 'lodash/fp'
import React, { useCallback, useRef } from 'react'
import styled from 'styled-components'
import { DrawableShape, ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { createPicture } from 'utils/selection'

const StyledToolbox = styled.div<{
  toolboxposition: 'top' | 'left'
  hover: boolean
}>`
  display: flex;

  ${({ hover }) =>
    hover &&
    `
    position:absolute;
  `}
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'row' : 'column')};
`

const StyledTool = styled.button<{ selected: boolean }>`
  width: 64px;
  height: 48px;
  ${({ selected }) => selected && `background:white;`}
`

type ToolType = {
  type: ToolsType
  lib: string
  isActive: boolean
  isDisabled?: boolean
  setActive: (marker: ToolsType) => void
}

const Tool = ({ type, lib, isActive, isDisabled = false, setActive }: ToolType) => {
  const handleClick = useCallback(() => {
    setActive(type)
  }, [type, setActive])

  return (
    <StyledTool disabled={isDisabled} selected={isActive} onClick={handleClick}>
      {lib}
    </StyledTool>
  )
}

type PictureToolType = {
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  setActiveTool: (tool: ToolsType) => void
  maxPictureSize: number
}

const PictureTool = ({
  setShapes,
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
      setShapes(prevShapes => [pictureShape, ...prevShapes])
      setActiveTool(ToolEnum.selection)
      setSelectedShape(pictureShape)
    },
    [maxPictureSize, setShapes, setActiveTool, setSelectedShape]
  )

  return (
    <input
      ref={inputRef}
      type="file"
      onClick={handleClick}
      onChange={handleChange}
      accept="image/png, image/gif, image/jpeg"
    />
  )
}

type ToolboxType = {
  activeTool: React.SetStateAction<ToolsType>
  hasActionToUndo?: boolean
  hasActionToRedo?: boolean
  undoAction: () => void
  redoAction: () => void
  clearCanvas: () => void
  setActiveTool: (tool: ToolsType) => void
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  maxPictureSize?: number
  toolboxPosition: 'top' | 'left'
  hover: boolean
}

const Toolbox = ({
  activeTool,
  hasActionToUndo = false,
  hasActionToRedo = false,
  clearCanvas,
  setActiveTool,
  undoAction,
  redoAction,
  setShapes,
  setSelectedShape,
  maxPictureSize = 300,
  toolboxPosition,
  hover
}: ToolboxType) => {
  const toolsTypes: ShapeEnum[] = [ShapeEnum.rect, ShapeEnum.circle, ShapeEnum.ellipse]

  return (
    <StyledToolbox toolboxposition={toolboxPosition} hover={hover}>
      <Tool
        type={ToolEnum.selection}
        lib="selection"
        isActive={activeTool === ToolEnum.selection}
        setActive={setActiveTool}
      />
      <Tool
        type={ToolEnum.move}
        lib="move"
        isActive={activeTool === ToolEnum.move}
        setActive={setActiveTool}
      />
      <Tool
        type={ToolEnum.undo}
        isDisabled={!hasActionToUndo}
        lib="Undo"
        isActive={activeTool === ToolEnum.undo}
        setActive={undoAction}
      />
      <Tool
        type={ToolEnum.redo}
        isDisabled={!hasActionToRedo}
        lib="Redo"
        isActive={activeTool === ToolEnum.redo}
        setActive={redoAction}
      />
      <Tool
        type={ToolEnum.clear}
        lib="Clear"
        isActive={activeTool === ToolEnum.clear}
        setActive={clearCanvas}
      />
      {_.map(
        toolType => (
          <Tool
            key={toolType}
            type={toolType}
            lib={toolType}
            isActive={activeTool === toolType}
            setActive={setActiveTool}
          />
        ),
        toolsTypes
      )}
      <PictureTool
        maxPictureSize={maxPictureSize}
        setSelectedShape={setSelectedShape}
        setActiveTool={setActiveTool}
        setShapes={setShapes}
      />
    </StyledToolbox>
  )
}

export default Toolbox
