import type { LayerItem } from '@editor/utils/layers'
import { type RefObject, useEffect, useState } from 'react'

/** The layer dragged, kept by the panel: the data of a drag cannot be read while it is dragged over the other layers */
export type DraggedLayer = Pick<LayerItem, 'id' | 'parentId'>

type useDragType = {
  disabled?: boolean
  ref: RefObject<HTMLDivElement | null>
  shape: DraggedLayer
  layoutDragging: DraggedLayer | undefined
  setLayoutDragging: (layer: DraggedLayer | undefined) => void
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

    // a shape is only dropped on the shapes of its group: it never leaves its group
    const canDrop = layoutDragging !== undefined && layoutDragging.id !== shape.id && layoutDragging.parentId === shape.parentId

    const handleDragEnd = () => {
      setLayoutDragging(undefined)
    }

    // the drop is refused unless the default of the move over the layer is prevented
    const handleDragOver = (e: DragEvent) => {
      if (canDrop) e.preventDefault()
    }

    const handleDragStart = (e: DragEvent) => {
      handleSelect([shape.id])
      if (!e.dataTransfer) return
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('draggableShapeId', shape.id)

      setLayoutDragging({ id: shape.id, parentId: shape.parentId })
    }

    const handleDragEnter = () => {
      if (canDrop) setIsOver(true)
    }

    const handleDragLeave = () => {
      setIsOver(false)
    }

    const handleDrop = (e: DragEvent) => {
      // the browser does not open the data dropped
      e.preventDefault()
      e.stopPropagation()
      if (canDrop) onSwapShapes(layoutDragging.id, shape.id)
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
