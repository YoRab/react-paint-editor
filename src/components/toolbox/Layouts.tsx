import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import map from 'types/lodash'
import { DrawableShape, ToolEnum, ToolsType } from 'types/Shapes'
import deleteIcon from 'assets/icons/trash.svg'
import _ from 'lodash/fp'

const StyledLayouts = styled.div<{ hover: boolean }>`
  display: inline-block;
  border: 1px solid black;
  width: 200px;
  overflow-y: auto;

  ${({ hover }) =>
    hover &&
    `
    position:absolute;
    right:0;
    height:60%;
  `}
`

const StyledLayout = styled.div<{ selected: boolean; isdragging: boolean; isover: boolean }>`
  border: 1px solid black;
  padding: 12px;
  padding-right: 24px;
  position: relative;
  cursor: move;
  ${({ selected }) => selected && 'background:yellow'};
  ${({ isdragging }) => isdragging && 'opacity:0.4'};
  ${({ isover }) => isover && '  border: 3px dotted #666;'};
`

const StyledRemove = styled.div`
  position: absolute;
  width: 36px;
  display: inline-block;
  right: 0;
  top: 0;
  bottom: 0;
  cursor: pointer;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: lightgray;
  }

  img {
    width: 16px;
    height: 16px;
  }
`

type LayoutType = {
  shape: DrawableShape
  selected: boolean
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleRemove: (shape: DrawableShape) => void
  handleSelect: (shape: DrawableShape) => void
  onMoveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layout = ({
  shape,
  selected,
  layoutDragging,
  setLayoutDragging,
  handleRemove,
  handleSelect,
  onMoveShapes
}: LayoutType) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)

  const onRemove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      handleRemove(shape)
    },
    [shape, handleRemove]
  )

  const onSelect = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      handleSelect(shape)
    },
    [shape, handleSelect]
  )

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      handleSelect(shape)
      if (!e.dataTransfer) return
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('draggableShapeId', shape.id)

      setLayoutDragging(shape.id)
    },
    [shape, setLayoutDragging, handleSelect]
  )

  const handleDragEnd = useCallback(() => {
    setLayoutDragging(undefined)
  }, [setLayoutDragging])

  const handleDragOver = useCallback((e: DragEvent) => {
    if (e.preventDefault) {
      e.preventDefault()
    }

    return false
  }, [])

  const handleDragEnter = useCallback(() => {
    layoutDragging !== shape.id && setIsOver(true)
  }, [layoutDragging, shape])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.stopPropagation() // stops the browser from redirecting.
      if (e.dataTransfer) {
        onMoveShapes(e.dataTransfer.getData('draggableShapeId'), shape.id)
      }
      return false
    },
    [shape, onMoveShapes]
  )

  useEffect(() => {
    if (!layoutDragging) setIsOver(false)
  }, [layoutDragging])

  useEffect(() => {
    ref.current?.addEventListener('dragstart', handleDragStart)
    ref.current?.addEventListener('dragend', handleDragEnd)
    ref.current?.addEventListener('dragover', handleDragOver)
    ref.current?.addEventListener('dragenter', handleDragEnter)
    ref.current?.addEventListener('dragleave', handleDragLeave)
    ref.current?.addEventListener('drop', handleDrop)

    return () => {
      ref.current?.removeEventListener('dragstart', handleDragStart)
      ref.current?.removeEventListener('dragend', handleDragEnd)
      ref.current?.removeEventListener('dragover', handleDragOver)
      ref.current?.removeEventListener('dragenter', handleDragEnter)
      ref.current?.removeEventListener('dragleave', handleDragLeave)
      ref.current?.removeEventListener('drop', handleDrop)
    }
  })

  return (
    <StyledLayout
      draggable="true"
      isdragging={layoutDragging === shape.id}
      isover={isOver}
      onClick={onSelect}
      selected={selected}
      ref={ref}>
      {shape.type}
      <StyledRemove onClick={onRemove}>
        <img src={deleteIcon} />
      </StyledRemove>
    </StyledLayout>
  )
}

type LayoutsType = {
  shapes: DrawableShape[]
  hover: boolean
  updateShapes: (shapes: DrawableShape[]) => void
  removeShape: (shape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
}

const Layouts = ({
  shapes,
  hover,
  updateShapes,
  removeShape,
  selectedShape,
  setSelectedShape,
  setActiveTool
}: LayoutsType) => {
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)

  const moveShapes = useCallback(
    (firstShapeId: string, lastShapeId: string) => {
      const firstShapeIndex = _.findIndex({ id: firstShapeId }, shapes)
      const lastShapeIndex = _.findIndex({ id: lastShapeId }, shapes)

      if (firstShapeIndex < lastShapeIndex) {
        updateShapes([
          ..._.slice(0, firstShapeIndex, shapes),
          ..._.slice(firstShapeIndex + 1, lastShapeIndex + 1, shapes),
          shapes[firstShapeIndex],
          ..._.slice(lastShapeIndex + 1, shapes.length, shapes)
        ])
      } else {
        updateShapes([
          ..._.slice(0, lastShapeIndex, shapes),
          shapes[firstShapeIndex],
          ..._.slice(lastShapeIndex, firstShapeIndex, shapes),
          ..._.slice(firstShapeIndex + 1, shapes.length, shapes)
        ])
      }
    },
    [shapes, updateShapes]
  )

  const handleSelect = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(shape)
      setActiveTool(ToolEnum.selection)
    },
    [setSelectedShape, setActiveTool]
  )

  return (
    <StyledLayouts hover={hover}>
      {map(
        shape => (
          <Layout
            key={shape.id}
            shape={shape}
            layoutDragging={layoutDragging}
            setLayoutDragging={setLayoutDragging}
            selected={selectedShape?.id === shape.id}
            handleSelect={handleSelect}
            handleRemove={removeShape}
            onMoveShapes={moveShapes}
          />
        ),
        shapes
      )}
    </StyledLayouts>
  )
}

export default Layouts
