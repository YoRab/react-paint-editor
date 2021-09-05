import _ from 'lodash/fp'
import React, { useCallback, useRef } from 'react'
import styled from 'styled-components'
import { DrawableShape, ShapeType } from 'types/Shapes'
import { createPicture } from 'utils/selection'

const StyledToolbox = styled.div``

const StyledTool = styled.button<{ selected: boolean }>`
  ${({ selected }) => selected && `background:white;`}
`

type ToolType = {
  type: ShapeType | undefined
  lib: string
  isActive: boolean
  setActive: (marker: ShapeType | undefined) => void
}

const Tool = ({ type, lib, isActive, setActive }: ToolType) => {
  const handleClick = useCallback(() => {
    setActive(type)
  }, [type, setActive])

  return (
    <StyledTool selected={isActive} onClick={handleClick}>
      {lib}
    </StyledTool>
  )
}

type PictureToolType = {
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  setActiveTool: (tool: ShapeType | undefined) => void
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
      setActiveTool(undefined)
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
  activeTool: React.SetStateAction<ShapeType | undefined>
  cancelMove: () => void
  setActiveTool: (tool: ShapeType | undefined) => void
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  maxPictureSize?: number
}

const Toolbox = ({
  activeTool,
  setActiveTool,
  cancelMove,
  setShapes,
  setSelectedShape,
  maxPictureSize = 300
}: ToolboxType) => {
  const toolsTypes: ShapeType[] = [ShapeType.rect, ShapeType.circle, ShapeType.ellipse]

  return (
    <StyledToolbox>
      <Tool
        type={undefined}
        lib="selection"
        isActive={activeTool === undefined}
        setActive={setActiveTool}
      />
      <Tool type={undefined} lib="Annuler" isActive={false} setActive={cancelMove} />
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
