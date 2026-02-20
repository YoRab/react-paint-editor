import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME, type UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import { buildDataToExport } from '@canvas/utils/data'
import { checkPositionIntersection, checkSelectionFrameCollision, checkSelectionIntersection } from '@canvas/utils/intersect'
import { addToSelectedShapes, applyToSelectedShape, buildShapesGroup, getSelectedShapes } from '@canvas/utils/selection'
import { refreshShape } from '@canvas/utils/shapes/index'
import { createPicture } from '@canvas/utils/shapes/picture'
import type { Point, SelectionType, ShapeEntity, StateData } from '@common/types/Shapes'
import { moveItemPosition } from '@common/utils/array'
import { isEqual, omit, set } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'
import { useCallback, useEffect, useRef, useState } from 'react'

const useShapes = (
  settings: UtilsSettings,
  width: number,
  height: number,
  isShiftPressed: boolean
): {
  registerEvent: (event: 'dataChanged', fn: (data: StateData, source: 'user' | 'remote') => void) => void
  unregisterEvent: (event: 'dataChanged', fn?: (data: StateData, source: 'user' | 'remote') => void) => void
  shapesRef: React.RefObject<ShapeEntity[]>
  selectedShape: SelectionType | undefined
  hoveredShape: ShapeEntity | undefined
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined
  setSelectionFrame: React.Dispatch<React.SetStateAction<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>>
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point) => void
  addShapes: (newShapes: ShapeEntity[]) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[]) => void
  addPictureShape: (fileOrUrl: File | string, maxWidth?: number, maxHeight?: number) => Promise<ShapeEntity>
  moveShapes: (startPositionShapeId: string, endPositionShapeId: string) => void
  saveShapes: () => void
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  toggleShapeVisibility: (shapes: ShapeEntity[]) => void
  toggleShapeLock: (shapeGroup: ShapeEntity[]) => void
  removeShape: (shapes: ShapeEntity[]) => void
  updateShape: (updatedShapes: ShapeEntity[], withSave?: boolean) => void
  backwardShape: () => void
  forwardShape: () => void
  clearShapes: (shapesToInit: ShapeEntity[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => void
  canGoBackward: boolean
  canGoForward: boolean
  canClear: boolean
} => {
  const shapesRef = useRef<ShapeEntity[]>([])
  const listeners = useRef<{
    dataChanged: ((data: StateData, source: 'user' | 'remote') => void)[]
  }>({ dataChanged: [] })

  const [selectionFrame, setSelectionFrame] = useState<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>(undefined)
  const [selectedShape, setSelectedShape] = useState<SelectionType | undefined>(undefined)
  const [hoveredShape, setHoveredShape] = useState<ShapeEntity | undefined>(undefined)
  const [savedShapes, setSavedShapes] = useState<{
    states: {
      shapes: ShapeEntity[]
      selectedShape: SelectionType | undefined
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
      return isEqual(prevSavedShaped.states[prevSavedShaped.cursor]?.shapes, shapesRef.current)
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

  const addShapes = useCallback((newShapes: ShapeEntity[]) => {
    shapesRef.current = [...newShapes, ...shapesRef.current]
  }, [])

  const duplicateShapes = useCallback((shapesToDuplicate: ShapeEntity[]) => {
    shapesRef.current = shapesRef.current.flatMap(marker => {
      const originalShape = shapesToDuplicate.find(shape => shape.id === marker.id)
      if (originalShape) {
        return [
          {
            ...originalShape,
            id: uniqueId(`${marker.type}_`)
          },
          marker
        ]
      }
      return marker
    })
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
        return getSelectedShapes(selectedShape)
          ?.map(shape => shape.id)
          .includes(shape.id)
          ? !!checkSelectionIntersection(ctx, shape, cursorPosition, settings)
          : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
      })
      setHoveredShape(foundShape)
    },
    [settings, selectedShape]
  )

  const addPictureShape = useCallback(
    async (fileOrUrl: File | string, maxWidth = PICTURE_DEFAULT_SIZE, maxHeight = PICTURE_DEFAULT_SIZE) => {
      const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight, settings)
      addShapes([pictureShape])
      saveShapes()
      return pictureShape
    },
    [addShapes, saveShapes, settings]
  )

  const updateShapes = useCallback(
    (updatedShapes: ShapeEntity[], withSave = false) => {
      shapesRef.current = shapesRef.current.map(marker => {
        const updatedShape = updatedShapes.find(shape => shape.id === marker.id)
        return updatedShape ?? marker
      })
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape
          ? buildShapesGroup(
              getSelectedShapes(prevSelectedShape).map(shape => updatedShapes.find(updatedShape => updatedShape.id === shape.id) ?? shape),
              settings
            )
          : prevSelectedShape
      )
      withSave && saveShapes()
    },
    [saveShapes, settings]
  )

  const resetShapes = useCallback(
    (newShapes: ShapeEntity[]) => {
      const pureShapes = newShapes.map(shape => omit(['chosen'], shape))
      shapesRef.current = pureShapes
      saveShapes()
    },
    [saveShapes]
  )

  const removeShape = useCallback(
    (shapes: ShapeEntity[]) => {
      const shapeIds = new Set(shapes.map(item => item.id))
      setSelectedShape(prevSelectedShape => {
        const prevIds = getSelectedShapes(prevSelectedShape).map(item => item.id)
        if (!prevIds || !shapeIds.size) return prevSelectedShape
        return prevIds.find(value => shapeIds.has(value)) ? undefined : prevSelectedShape
      })
      shapesRef.current = shapesRef.current.filter(item => !shapeIds?.has(item.id))
      saveShapes()
    },
    [saveShapes]
  )

  const moveCursor = useCallback((getNewCursor: (shapes: typeof savedShapes) => number) => {
    setSavedShapes(prevSavedShaped => {
      const newCursor = getNewCursor(prevSavedShaped)
      shapesRef.current = prevSavedShaped.states[newCursor]?.shapes ?? []
      setSelectedShape(prevSavedShaped.states[newCursor]?.selectedShape)
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

      resetShapes(moveItemPosition(shapes, startPositionShapeIndex, endPositionShapeIndex))
    },
    [resetShapes]
  )

  const toggleShapeVisibility = useCallback(
    (shapes: ShapeEntity[]) => {
      const shapesToUpdate = shapesRef.current
      const shapeIds = new Set(shapes.map(item => item.id))
      const newShapes = shapesToUpdate.map(shape => {
        if (shapeIds.has(shape.id)) {
          return set('visible', shape.visible === false, shape)
        }
        return shape
      })

      setSelectedShape(applyToSelectedShape(shape => set('visible', shape.visible === false, shape), settings))

      resetShapes(newShapes)
    },
    [resetShapes, settings]
  )

  const toggleShapeLock = useCallback(
    (shapeGroup: ShapeEntity[]) => {
      const shapes = shapesRef.current
      const shapeIds = new Set(shapeGroup.map(item => item.id))
      const newShapes = shapes.map(shape => {
        if (shapeIds.has(shape.id)) {
          return set('locked', !shape.locked, shape)
        }
        return shape
      })

      setSelectedShape(applyToSelectedShape(shape => set('locked', !shape.locked, shape), settings))

      resetShapes(newShapes)
    },
    [resetShapes, settings]
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
    const currentShapesState = savedShapes.states[savedShapes.cursor]!
    const shapes = buildDataToExport(currentShapesState.shapes, width, height)
    for (const listener of listeners.current.dataChanged) {
      listener(shapes, currentShapesState.source)
    }
  }, [width, height, savedShapes])

  useEffect(() => {
    shapesRef.current = shapesRef.current.map(shape => refreshShape(shape, settings))
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape === undefined
        ? undefined
        : buildShapesGroup(
            getSelectedShapes(prevSelectedShape).map(shape => refreshShape(shape, settings)),
            settings
          )
    )
  }, [settings])

  const refreshSelectedShapes = useCallback(
    (ctx: CanvasRenderingContext2D, cursorPosition: Point) => {
      setSelectionFrame(prev => {
        const newSelectionFrame: [Point, Point] = [prev?.frame[0] ?? [cursorPosition[0], cursorPosition[1]], [cursorPosition[0], cursorPosition[1]]]

        const foundShapes = shapesRef.current.filter(shape => {
          return checkSelectionFrameCollision(ctx, shape, newSelectionFrame)
        })

        const shapesGroup = buildShapesGroup(foundShapes, settings)
        setSelectedShape(isShiftPressed ? buildShapesGroup(addToSelectedShapes(prev?.oldSelection, foundShapes), settings) : shapesGroup)
        return { oldSelection: prev?.oldSelection, frame: newSelectionFrame }
      })
    },
    [settings, isShiftPressed]
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
    addShapes,
    duplicateShapes,
    addPictureShape,
    moveShapes,
    saveShapes,
    setSelectedShape,
    refreshHoveredShape,
    toggleShapeVisibility,
    toggleShapeLock,
    removeShape,
    updateShape: updateShapes,
    backwardShape,
    forwardShape,
    clearShapes,
    canGoBackward,
    canGoForward,
    canClear
  }
}

export default useShapes
