import { useCallback, useEffect, useRef, useState } from 'react'
import type { ShapeEntity } from 'types/Shapes'
import _ from 'lodash/fp'
import { createPicture } from 'utils/shapes/picture'

const useShapes = (onDataChanged: () => void = _.noop) => {
  const shapesRef = useRef<ShapeEntity[]>([])
  const onDataChangedRef = useRef<() => void>(onDataChanged)
  onDataChangedRef.current = onDataChanged

  const [selectedShape, setSelectedShape] = useState<ShapeEntity | undefined>(undefined)

  const [savedShapes, setSavedShapes] = useState<{
    states: {
      shapes: ShapeEntity[]
      selectedShape: ShapeEntity | undefined
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

  const addShape = useCallback((newShape: ShapeEntity) => {
    shapesRef.current = [newShape, ...shapesRef.current]
  }, [])

  const addPictureShape = useCallback(
    async (fileOrUrl: File | string, maxWidth = 300, maxHeight = 300) => {
      const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight)
      addShape(pictureShape)
      saveShapes()
      return pictureShape
    },
    [addShape, saveShapes]
  )

  const updateShape = useCallback(
    (updatedShape: ShapeEntity, withSave = false) => {
      shapesRef.current = shapesRef.current.map(marker => {
        return marker.id === selectedShape?.id ? updatedShape : marker
      })
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === updatedShape.id ? updatedShape : prevSelectedShape
      )
      withSave && saveShapes()
    },
    [selectedShape, saveShapes]
  )

  const updateShapes = useCallback(
    (newShapes: ShapeEntity[]) => {
      const pureShapes = newShapes.map(shape => _.omit(['chosen'], shape)) as ShapeEntity[]
      shapesRef.current = pureShapes
      saveShapes()
    },
    [saveShapes]
  )

  const removeShape = useCallback(
    (shape: ShapeEntity) => {
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

  const clearShapes = useCallback((shapesToInit: ShapeEntity[] = [], clearHistory = false) => {
    setSelectedShape(undefined)
    shapesRef.current = shapesToInit
    setSavedShapes(prevSavedShaped => {
      return clearHistory
        ? {
            states: [{ shapes: shapesToInit, selectedShape: undefined }],
            cursor: 0
          }
        : {
            states: [
              ...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
              {
                shapes: shapesToInit,
                selectedShape: undefined
              }
            ],
            cursor: prevSavedShaped.cursor + 1
          }
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

  const toggleShapeVisibility = useCallback(
    (shape: ShapeEntity) => {
      const shapes = shapesRef.current
      const shapeIndex = _.findIndex({ id: shape.id }, shapes)
      if (shapeIndex < 0) return
      const newShape = _.set('visible', shape.visible === false, shape)
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === newShape.id ? newShape : prevSelectedShape
      )
      updateShapes(_.set(shapeIndex, newShape, shapes))
    },
    [updateShapes]
  )

  const toggleShapeLock = useCallback(
    (shape: ShapeEntity) => {
      const shapes = shapesRef.current
      const shapeIndex = _.findIndex({ id: shape.id }, shapes)
      if (shapeIndex < 0) return
      const newShape = _.set('locked', !shape.locked, shape)
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === newShape.id ? newShape : prevSelectedShape
      )
      updateShapes(_.set(shapeIndex, newShape, shapes))
    },
    [updateShapes]
  )

  useEffect(() => {
    onDataChangedRef.current()
  }, [savedShapes])

  return {
    shapesRef,
    selectedShape,
    addShape,
    addPictureShape,
    moveShapes,
    saveShapes,
    setSelectedShape,
    toggleShapeVisibility,
    toggleShapeLock,
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
