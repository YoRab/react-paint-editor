import { RefObject, useEffect, useState } from 'react'
import { DrawableShape } from 'types/Shapes'

type useDragType = {
  ref: RefObject<HTMLDivElement>
  shape: DrawableShape
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleSelect: (shape: DrawableShape) => void
  onMoveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const useDrag = ({
  ref,
  shape,
  layoutDragging,
  setLayoutDragging,
  handleSelect,
  onMoveShapes
}: useDragType) => {
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    if (!layoutDragging) setIsOver(false)
  }, [layoutDragging])

  useEffect(() => {
    const layoutRef = ref.current
    if (!layoutRef) return

    const handleDragEnd = () => {
      setLayoutDragging(undefined)
    }

    const handleDragOver = (e: DragEvent) => {
      if (e.preventDefault) {
        e.preventDefault()
      }

      return false
    }
    const handleDragStart = (e: DragEvent) => {
      handleSelect(shape)
      if (!e.dataTransfer) return
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('draggableShapeId', shape.id)

      setLayoutDragging(shape.id)
    }

    const handleDragEnter = () => {
      layoutDragging !== shape.id && setIsOver(true)
    }

    const handleDragLeave = () => {
      setIsOver(false)
    }

    const handleDrop = (e: DragEvent) => {
      e.stopPropagation() // stops the browser from redirecting.
      if (e.dataTransfer) {
        onMoveShapes(e.dataTransfer.getData('draggableShapeId'), shape.id)
      }
      return false
    }

    layoutRef.addEventListener('dragstart', handleDragStart)
    layoutRef.addEventListener('dragend', handleDragEnd)
    layoutRef.addEventListener('dragover', handleDragOver)
    layoutRef.addEventListener('dragenter', handleDragEnter)
    layoutRef.addEventListener('dragleave', handleDragLeave)
    layoutRef.addEventListener('drop', handleDrop)

    return () => {
      layoutRef.removeEventListener('dragstart', handleDragStart)
      layoutRef.removeEventListener('dragend', handleDragEnd)
      layoutRef.removeEventListener('dragover', handleDragOver)
      layoutRef.removeEventListener('dragenter', handleDragEnter)
      layoutRef.removeEventListener('dragleave', handleDragLeave)
      layoutRef.removeEventListener('drop', handleDrop)
    }
  }, [ref, shape, setLayoutDragging, handleSelect, onMoveShapes, layoutDragging])

  return { isOver }
}

export default useDrag