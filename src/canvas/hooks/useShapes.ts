import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME, type UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import { buildDataToExport } from '@canvas/utils/data'
import { checkPositionIntersection, checkSelectionFrameCollision, checkSelectionIntersection } from '@canvas/utils/intersect'
import { refreshShape } from '@canvas/utils/shapes/index'
import { createPicture } from '@canvas/utils/shapes/picture'
import type { Point, ShapeEntity, StateData } from '@common/types/Shapes'
import { moveItemPosition } from '@common/utils/array'
import { isEqual, omit, set } from '@common/utils/object'
import { useCallback, useEffect, useRef, useState } from 'react'

const useShapes = (settings: UtilsSettings, width: number, height: number) => {
  const shapesRef = useRef<ShapeEntity[]>([])
  const listeners = useRef<{
    dataChanged: ((data: StateData, source: 'user' | 'remote') => void)[]
  }>({ dataChanged: [] })

  const [selectionFrame, setSelectionFrame] = useState<[Point, Point] | undefined>(undefined)
  const [selectedShape, setSelectedShape] = useState<ShapeEntity | undefined>(undefined)
  const [hoveredShape, setHoveredShape] = useState<ShapeEntity | undefined>(undefined)
  const [savedShapes, setSavedShapes] = useState<{
    states: {
      shapes: ShapeEntity[]
      selectedShape: ShapeEntity | undefined
      source: 'user' | 'remote'
    }[]
    cursor: number
  }>({
    states: [{ shapes: [], selectedShape: undefined, source: 'remote' }],
    cursor: 0
  })

  const canGoBackward = savedShapes.cursor > 0
  const canGoForward = savedShapes.cursor < savedShapes.states.length - 1
  const canClear = shapesRef.current.length > 0

  const saveShapes = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      return isEqual(prevSavedShaped.states[prevSavedShaped.cursor].shapes, shapesRef.current)
        ? prevSavedShaped
        : {
            states: [
              ...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
              {
                shapes: shapesRef.current,
                selectedShape,
                source: 'user'
              }
            ],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [selectedShape])

  const addShape = useCallback((newShape: ShapeEntity) => {
    shapesRef.current = [newShape, ...shapesRef.current]
  }, [])

  const refreshHoveredShape = useCallback(
    (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => {
      if (
        (e.target && 'className' in e.target && ![DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME].includes(e.target.className as string)) ||
        !isInsideMask
      ) {
        setHoveredShape(undefined)
        return
      }

      const foundShape = shapesRef.current.find(shape => {
        return shape.id === selectedShape?.id
          ? !!checkSelectionIntersection(ctx, selectedShape, cursorPosition, settings)
          : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
      })
      setHoveredShape(foundShape)
    },
    [settings, selectedShape]
  )

  const addPictureShape = useCallback(
    async (fileOrUrl: File | string, maxWidth = PICTURE_DEFAULT_SIZE, maxHeight = PICTURE_DEFAULT_SIZE) => {
      const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight, settings)
      addShape(pictureShape)
      saveShapes()
      return pictureShape
    },
    [addShape, saveShapes, settings]
  )

  const updateShape = useCallback(
    (updatedShape: ShapeEntity, withSave = false) => {
      shapesRef.current = shapesRef.current.map(marker => {
        return marker.id === selectedShape?.id ? updatedShape : marker
      })
      setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === updatedShape.id ? updatedShape : prevSelectedShape))
      withSave && saveShapes()
    },
    [selectedShape, saveShapes]
  )

  const updateShapes = useCallback(
    (newShapes: ShapeEntity[]) => {
      const pureShapes = newShapes.map(shape => omit(['chosen'], shape))
      shapesRef.current = pureShapes
      saveShapes()
    },
    [saveShapes]
  )

  const removeShape = useCallback(
    (shape: ShapeEntity) => {
      setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape))
      shapesRef.current = shapesRef.current.filter(item => item.id !== shape.id)
      saveShapes()
    },
    [saveShapes]
  )

  const moveCursor = useCallback((getNewCursor: (shapes: typeof savedShapes) => number) => {
    setSavedShapes(prevSavedShaped => {
      const newCursor = getNewCursor(prevSavedShaped)
      shapesRef.current = prevSavedShaped.states[newCursor].shapes
      setSelectedShape(prevSavedShaped.states[newCursor].selectedShape)
      return set('cursor', newCursor, prevSavedShaped)
    })
  }, [])

  const backwardShape = useCallback(() => {
    moveCursor(prevSavedShaped => Math.max(0, prevSavedShaped.cursor - 1))
  }, [moveCursor])

  const forwardShape = useCallback(() => {
    moveCursor(prevSavedShaped => Math.min(prevSavedShaped.states.length - 1, prevSavedShaped.cursor + 1))
  }, [moveCursor])

  const clearShapes = useCallback((shapesToInit: ShapeEntity[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => {
    setSelectedShape(undefined)
    shapesRef.current = shapesToInit
    setSavedShapes(prevSavedShaped => {
      return options.clearHistory
        ? {
            states: [
              {
                shapes: shapesToInit,
                selectedShape: undefined,
                source: options.source
              }
            ],
            cursor: 0
          }
        : {
            states: [
              ...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
              {
                shapes: shapesToInit,
                selectedShape: undefined,
                source: options.source
              }
            ],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [])

  const moveShapes = useCallback(
    (startPositionShapeId: string, endPositionShapeId: string) => {
      const shapes = shapesRef.current
      const startPositionShapeIndex = shapes.findIndex(shape => shape.id === startPositionShapeId)
      const endPositionShapeIndex = shapes.findIndex(shape => shape.id === endPositionShapeId)

      updateShapes(moveItemPosition(shapes, startPositionShapeIndex, endPositionShapeIndex))
    },
    [updateShapes]
  )

  const toggleShapeVisibility = useCallback(
    (shape: ShapeEntity) => {
      const shapes = shapesRef.current
      const shapeIndex = shapes.findIndex(item => item.id === shape.id)
      if (shapeIndex < 0) return
      const newShape = set('visible', shape.visible === false, shape)
      setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === newShape.id ? newShape : prevSelectedShape))
      updateShapes(set(shapeIndex, newShape, shapes))
    },
    [updateShapes]
  )

  const toggleShapeLock = useCallback(
    (shape: ShapeEntity) => {
      const shapes = shapesRef.current
      const shapeIndex = shapes.findIndex(item => item.id === shape.id)
      if (shapeIndex < 0) return
      const newShape = set('locked', !shape.locked, shape)
      setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === newShape.id ? newShape : prevSelectedShape))
      updateShapes(set(shapeIndex, newShape, shapes))
    },
    [updateShapes]
  )

  const registerEvent = useCallback((event: 'dataChanged', fn: (data: StateData, source: 'user' | 'remote') => void) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.current.hasOwnProperty(event)) return
    listeners.current[event] = [...listeners.current[event], fn]
  }, [])

  const unregisterEvent = useCallback((event: 'dataChanged', fn?: (data: StateData, source: 'user' | 'remote') => void) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.current.hasOwnProperty(event)) return
    if (fn) {
      const currentFnIndex = listeners.current[event].indexOf(fn)
      listeners.current[event] = [...listeners.current[event].slice(0, currentFnIndex), ...listeners.current[event].slice(currentFnIndex + 1)]
    } else {
      listeners.current[event] = []
    }
  }, [])

  useEffect(() => {
    const currentShapesState = savedShapes.states[savedShapes.cursor]
    const shapes = buildDataToExport(currentShapesState.shapes, width, height)
    for (const listener of listeners.current.dataChanged) {
      listener(shapes, currentShapesState.source)
    }
  }, [width, height, savedShapes])

  useEffect(() => {
    shapesRef.current = shapesRef.current.map(shape => refreshShape(shape, settings))
    setSelectedShape(prevSelectedShape => (prevSelectedShape === undefined ? undefined : refreshShape(prevSelectedShape, settings)))
  }, [settings])

  const refreshSelectedShapes = useCallback(
    (ctx: CanvasRenderingContext2D, cursorPosition: Point) => {
      setSelectionFrame(prev => {
        const newSelectionFrame: [Point, Point] = [prev?.[0] ?? [cursorPosition[0], cursorPosition[1]], [cursorPosition[0], cursorPosition[1]]]

        const foundShape = shapesRef.current.filter(shape => {
          return checkSelectionFrameCollision(ctx, shape, newSelectionFrame, settings)
        })
        setSelectedShape(foundShape?.[0])
        return newSelectionFrame
      })
    },
    [settings]
  )

  return {
    registerEvent,
    unregisterEvent,
    shapesRef,
    selectedShape,
    hoveredShape,
    selectionFrame,
    setSelectionFrame,
    refreshSelectedShapes,
    addShape,
    addPictureShape,
    moveShapes,
    saveShapes,
    setSelectedShape,
    refreshHoveredShape,
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
