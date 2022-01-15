import { useCallback, useRef, useState } from 'react'
import { DrawableShape } from 'types/Shapes'
import _ from 'lodash/fp'
import { createPicture } from 'utils/data'

const useShapes = () => {
  const shapesRef = useRef<DrawableShape[]>([])

  const [selectedShape, setSelectedShape] = useState<DrawableShape | undefined>(undefined)

  const [savedShapes, setSavedShapes] = useState<{
    states: {
      shapes: DrawableShape[]
      selectedShape: DrawableShape | undefined
    }[]
    cursor: number
  }>({
    states: [{ shapes: [], selectedShape: undefined }],
    cursor: 0
  })

  const canGoBackward = savedShapes.cursor > 0
  const canGoForward = savedShapes.cursor < savedShapes.states.length - 1
  const canClear = shapesRef.current.length > 0

  const saveShapes = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      return _.isEqual(
        _.get([prevSavedShaped.cursor, 'shapes'], prevSavedShaped.states),
        shapesRef.current
      )
        ? prevSavedShaped
        : {
            states: [
              ...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
              {
                shapes: shapesRef.current,
                selectedShape
              }
            ],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [selectedShape])

  const addShape = useCallback((newShape: DrawableShape) => {
    shapesRef.current = [newShape, ...shapesRef.current]
  }, [])

  const addPictureShape = useCallback(
    async (file: File, maxSize = 300) => {
      const pictureShape = await createPicture(file, maxSize)
      addShape(pictureShape)
      return pictureShape
    },
    [addShape]
  )

  const updateShape = useCallback(
    (updatedShape: DrawableShape) => {
      shapesRef.current = shapesRef.current.map(marker => {
        return marker.id === selectedShape?.id ? updatedShape : marker
      })
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === updatedShape.id ? updatedShape : prevSelectedShape
      )
    },
    [selectedShape]
  )

  const updateShapes = useCallback(
    (newShapes: DrawableShape[]) => {
      const pureShapes = newShapes.map(shape => _.omit(['chosen'], shape)) as DrawableShape[]
      shapesRef.current = pureShapes
      saveShapes()
    },
    [saveShapes]
  )

  const removeShape = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
      )
      shapesRef.current = _.remove({ id: shape.id }, shapesRef.current)
      saveShapes()
    },
    [saveShapes]
  )

  const backwardShape = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      const newCursor = Math.max(0, prevSavedShaped.cursor - 1)
      shapesRef.current = _.get([newCursor, 'shapes'], prevSavedShaped.states)
      setSelectedShape(_.get([newCursor, 'selectedShape'], prevSavedShaped.states))
      return _.set('cursor', newCursor, prevSavedShaped)
    })
  }, [])

  const forwardShape = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      const newCursor = Math.min(prevSavedShaped.states.length - 1, prevSavedShaped.cursor + 1)
      shapesRef.current = _.get([newCursor, 'shapes'], prevSavedShaped.states)
      setSelectedShape(_.get([newCursor, 'selectedShape'], prevSavedShaped.states))
      return _.set('cursor', newCursor, prevSavedShaped)
    })
  }, [])

  const clearShapes = useCallback((shapesToInit: DrawableShape[] = []) => {
    setSelectedShape(undefined)
    shapesRef.current = shapesToInit
    setSavedShapes({
      states: [{ shapes: shapesToInit, selectedShape: undefined }],
      cursor: 0
    })
  }, [])

  const moveShapes = useCallback(
    (firstShapeId: string, lastShapeId: string) => {
      const shapes = shapesRef.current
      const firstShapeIndex = _.findIndex({ id: firstShapeId }, shapes)
      const lastShapeIndex = _.findIndex({ id: lastShapeId }, shapes)

      // todo utils
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
    [updateShapes]
  )

  return {
    shapesRef,
    selectedShape,
    addShape,
    addPictureShape,
    moveShapes,
    saveShapes,
    setSelectedShape,
    removeShape,
    updateShape,
    backwardShape,
    forwardShape,
    clearShapes,
    canGoBackward,
    canGoForward,
    canClear
  }
}

export default useShapes