import type { ShapeEntity } from '@canvas/index'
import { type RefObject, useEffect, useState } from 'react'

type useDragType = {
  disabled?: boolean
  ref: RefObject<HTMLDivElement | null>
  shape: Pick<ShapeEntity, 'id'>
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleSelect: (ids: string[]) => void
  onSwapShapes: (firstShapeId: string, lastShapeId: string) => void
}

const useDrag = ({ disabled = false, ref, shape, layoutDragging, setLayoutDragging, handleSelect, onSwapShapes }: useDragType) => {
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
      handleSelect([shape.id])
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
        onSwapShapes(e.dataTransfer.getData('draggableShapeId'), shape.id)
      }
      return false
    }

    if (!disabled) {
      layoutRef.addEventListener('dragstart', handleDragStart)
      layoutRef.addEventListener('dragend', handleDragEnd)
      layoutRef.addEventListener('dragover', handleDragOver)
      layoutRef.addEventListener('dragenter', handleDragEnter)
      layoutRef.addEventListener('dragleave', handleDragLeave)
      layoutRef.addEventListener('drop', handleDrop)
    }
    return () => {
      if (!disabled) {
        layoutRef.removeEventListener('dragstart', handleDragStart)
        layoutRef.removeEventListener('dragend', handleDragEnd)
        layoutRef.removeEventListener('dragover', handleDragOver)
        layoutRef.removeEventListener('dragenter', handleDragEnter)
        layoutRef.removeEventListener('dragleave', handleDragLeave)
        layoutRef.removeEventListener('drop', handleDrop)
      }
    }
  }, [disabled, ref, shape, setLayoutDragging, handleSelect, onSwapShapes, layoutDragging])

  return { isOver }
}

export default useDrag
