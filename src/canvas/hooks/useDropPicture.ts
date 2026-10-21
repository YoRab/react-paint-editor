import { PICTURE_DROP_GAP, PICTURE_MIME_TYPES } from '@canvas/constants/picture'
import type { PaintStore } from '@canvas/store/paintStore'
import { getCursorPositionInTransformedCanvas } from '@canvas/utils/intersect'
import { useEffect } from 'react'

const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false

/**
 * Adds the image files dropped from the file explorer on the canvas as pictures, centered on the cursor. Without this,
 * the browser would open the file. Nothing is prevented when the drop is not allowed (withDropPicture, edition, picture tool).
 */
const useDropPicture = (store: PaintStore, canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return

    const isDropAllowed = (e: DragEvent) => hasFiles(e) && store.selectors.selectWithDropPicture(store.getState())

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer || !isDropAllowed(e)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = async (e: DragEvent) => {
      if (!isDropAllowed(e)) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files ?? [])
      const pictures = files.filter(file => PICTURE_MIME_TYPES.includes(file.type))
      for (const file of files) {
        if (!pictures.includes(file)) store.emit('pictureDropFailed', file, new Error(`Unsupported file type: ${file.type || file.name}`))
      }
      const [x, y] = getCursorPositionInTransformedCanvas(e, canvas, store.getSettings())
      // one at a time: each picture is selected after the previous one, and they are not stacked at the same place
      for (const [index, file] of pictures.entries()) {
        try {
          await store.actions.addPicture(file, { position: [x + index * PICTURE_DROP_GAP, y + index * PICTURE_DROP_GAP] })
        } catch (error) {
          console.warn(error)
          store.emit('pictureDropFailed', file, error)
        }
      }
    }

    canvas.addEventListener('dragover', onDragOver)
    canvas.addEventListener('drop', onDrop)
    return () => {
      canvas.removeEventListener('dragover', onDragOver)
      canvas.removeEventListener('drop', onDrop)
    }
  }, [store, canvas])
}

export default useDropPicture
