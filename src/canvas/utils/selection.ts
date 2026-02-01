import type { UtilsSettings } from '@canvas/constants/app'
import { createRectangle } from '@canvas/utils/shapes/rectangle'
import { rotatePoint } from '@canvas/utils/trigo'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool } from '@common/types/tools'
import { SETTINGS_DEFAULT_RECT } from '@editor/constants/tools'
import { checkPositionIntersection, checkSelectionIntersection } from './intersect'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: SelectionType,
  cursorPosition: Point
): SelectionModeData<Point | number> | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: 'translate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      hasBeenDuplicated: false,
      dateStart: Date.now()
    }
  }
  if (hoverMode.mode === 'rotate') {
    const { center: centerBeforeResize } = selectedShape.computed
    const center: Point = [centerBeforeResize[0], centerBeforeResize[1]]
    return {
      mode: 'rotate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      center
    }
  }
  if (hoverMode.mode === 'resize') {
    return {
      mode: 'resize',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      anchor: hoverMode.anchor
    }
  }
  return undefined
}

export const selectShape = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  cursorPosition: Point,
  settings: UtilsSettings,
  selectedShape: SelectionType | undefined,
  isTouchGesture: boolean,
  withFrameSelection: boolean,
  isGroupMode: boolean
): {
  mode: SelectionModeData<Point | number>
  shape: SelectionType | undefined
} => {
  let selectedShapePositionIntersection: false | HoverModeData = false
  if (selectedShape) {
    selectedShapePositionIntersection = checkSelectionIntersection(
      ctx,
      selectedShape,
      cursorPosition,
      settings,
      true,
      isTouchGesture ? 20 : undefined
    )

    const newSelectionMode = getNewSelectionData(selectedShapePositionIntersection || { mode: 'default' }, selectedShape, cursorPosition)
    if (newSelectionMode?.mode === 'resize' || newSelectionMode?.mode === 'rotate') {
      return { shape: selectedShape, mode: newSelectionMode }
    }
  }
  const foundShape = shapes.find(shape => {
    return getSelectedShapes(selectedShape).find(selectedShape => shape.id === selectedShape?.id)
      ? selectedShapePositionIntersection && isGroupMode
        ? checkSelectionIntersection(ctx, shape, cursorPosition, settings, true, isTouchGesture ? 20 : undefined)
        : !!selectedShapePositionIntersection
      : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
  })
  if (foundShape) {
    if (isGroupMode) {
      const foundShapeGroup = getSelectedShapes(selectedShape).find(shape => shape.id === foundShape?.id)
        ? buildShapesGroup(omitFromSelectedShapes(selectedShape, foundShape), settings)
        : buildShapesGroup(addToSelectedShapes(selectedShape, [foundShape]), settings)

      return {
        shape: foundShapeGroup,
        mode: {
          mode: 'translate',
          cursorStartPosition: cursorPosition,
          hasBeenDuplicated: false,
          dateStart: Date.now(),
          originalShape: foundShapeGroup!
        }
      }
    }
    const foundShapeGroup = getSelectedShapes(selectedShape).find(shape => shape.id === foundShape?.id)
      ? selectedShape
      : buildShapesGroup([foundShape], settings)
    return {
      shape: foundShapeGroup,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        hasBeenDuplicated: false,
        dateStart: Date.now(),
        originalShape: foundShapeGroup!
      }
    }
  }

  if (isGroupMode) {
    return {
      shape: selectedShape,
      mode: {
        mode: withFrameSelection ? 'selectionFrame' : 'default'
      }
    }
  }
  return {
    shape: undefined,
    mode: {
      mode: withFrameSelection ? 'selectionFrame' : 'default'
    }
  }
}

const rotateRect = (rect: Rect, rotation: number, withRotation = true): [Point, Point, Point, Point] => {
  const points: [Point, Point, Point, Point] = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height]
  ]
  if (!withRotation) return points
  const center: Point = [rect.x + rect.width / 2, rect.y + rect.height / 2]
  return points.map(point =>
    rotatePoint({
      point: [point[0], point[1]],
      origin: center,
      rotation
    })
  ) as [Point, Point, Point, Point]
}

export const buildShapesGroup = (shapes: ShapeEntity[], settings: UtilsSettings): SelectionType | undefined => {
  if (!shapes.length) return undefined
  if (shapes.length === 1) return shapes[0]

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const checkRotatedShapes = shapes.some(shape => shape.rotation !== shapes[0]!.rotation)
  const rotation = checkRotatedShapes ? 0 : (shapes[0]?.rotation ?? 0)

  for (const shape of shapes) {
    const { borders } = shape.computed
    const rotatedPoints = rotateRect(borders, shape.rotation ?? 0, checkRotatedShapes)
    minX = Math.min(rotatedPoints[0][0], rotatedPoints[1][0], rotatedPoints[2][0], rotatedPoints[3][0], minX)
    maxX = Math.max(rotatedPoints[0][0], rotatedPoints[1][0], rotatedPoints[2][0], rotatedPoints[3][0], maxX)
    minY = Math.min(rotatedPoints[0][1], rotatedPoints[1][1], rotatedPoints[2][1], rotatedPoints[3][1], minY)
    maxY = Math.max(rotatedPoints[0][1], rotatedPoints[1][1], rotatedPoints[2][1], rotatedPoints[3][1], maxY)
  }
  const groupRectangle = createRectangle(
    {
      id: 'test',
      type: 'rect',
      settings: SETTINGS_DEFAULT_RECT
    },
    [minX, minY],
    settings,
    true,
    maxX - minX,
    maxY - minY
  )

  const style = shapes.slice(1)!.reduce((acc, shape) => {
    const shapeStyle = shape.style ?? {}
    const newAcc: Record<string, unknown> = {}

    for (const key in shapeStyle) {
      if (acc[key as keyof typeof acc] === undefined) continue
      if (shapeStyle[key as keyof typeof acc] === undefined) continue

      if (acc[key as keyof typeof acc] === shapeStyle[key as keyof typeof shapeStyle]) {
        newAcc[key] = acc[key as keyof typeof acc]!
      }
    }
    return newAcc
  }, shapes[0]!.style ?? {})

  return {
    id: shapes.map(shape => shape.id).join('-'),
    type: 'group',
    shapes,
    rotation,
    visible: true,
    locked: false,
    selection: groupRectangle.selection,
    x: groupRectangle.x,
    y: groupRectangle.y,
    width: groupRectangle.width,
    height: groupRectangle.height,
    style,
    computed: groupRectangle.computed
  }
}

export const applyToSelectedShape =
  (applyToShape: (shape: ShapeEntity, settings: UtilsSettings) => ShapeEntity, settings: UtilsSettings) =>
  (selection: SelectionType | undefined): SelectionType | undefined => {
    if (!selection) return undefined
    const shapes = selection.type === 'group' ? selection.shapes.map(shape => applyToShape(shape, settings)) : [applyToShape(selection, settings)]
    return buildShapesGroup(shapes, settings)
  }

export const getSelectedShapes = (selection: SelectionType | undefined): ShapeEntity[] => {
  if (!selection) return []
  return selection.type === 'group' ? selection.shapes : [selection]
}

export const addToSelectedShapes = (selection: SelectionType | undefined, shapes: ShapeEntity[]): ShapeEntity[] => {
  const currentShapes = getSelectedShapes(selection)
  return [...new Set([...currentShapes, ...shapes])]
}

export const omitFromSelectedShapes = (selection: SelectionType | undefined, shape: ShapeEntity): ShapeEntity[] => {
  return getSelectedShapes(selection).filter(selectedShape => selectedShape.id !== shape.id)
}

export const getSelectedShapesTools = (selection: SelectionType | undefined, availableTools: CustomTool[]): CustomTool | undefined => {
  const selectedShapes = getSelectedShapes(selection)
  const tools = selectedShapes
    .map(shape => {
      return availableTools.find(tool => tool.id === shape?.toolId) || availableTools.find(tool => tool.type === shape?.type)
    })
    .filter(tool => tool !== undefined)
  if (!tools.length) return undefined
  if (tools.length === 1) return tools[0]

  const settings = tools.slice(1)!.reduce((settingsAcc, tool) => {
    const newSettings: CustomTool['settings'] = {}
    for (const key in tool.settings) {
      if (settingsAcc[key as keyof typeof settingsAcc] === undefined) continue
      if (tool.settings[key as keyof typeof tool.settings]?.hidden || settingsAcc[key as keyof typeof settingsAcc]?.hidden) continue

      const accSet = settingsAcc[key as keyof typeof settingsAcc]!
      const newSet = tool.settings[key as keyof typeof tool.settings]!
      const settings: Partial<typeof accSet> = {}

      if (
        'min' in newSet &&
        'min' in accSet &&
        newSet.min === accSet.min &&
        'max' in newSet &&
        'max' in accSet &&
        newSet.max === accSet.max &&
        'step' in newSet &&
        'step' in accSet &&
        newSet.step === accSet.step
      ) {
        settings.min = newSet.min
        settings.max = newSet.max
        settings.step = newSet.step
      }

      //@ts-expect-error TODO fix type here
      if ('values' in newSet && 'values' in accSet && newSet.values?.join(',') === accSet.values?.join(',')) {
        //@ts-expect-error TODO fix type here
        settings.values = newSet.values
      }

      if (Object.keys(settings).length > 0 || key === 'closedPoints') {
        //@ts-expect-error TODO fix type here
        newSettings[key as keyof typeof newSettings] = settings
      }
    }
    return newSettings
  }, tools[0]!.settings)

  return {
    id: tools.map(tool => tool.id).join('-'),
    icon: '',
    label: 'group',
    type: 'group',
    settings: settings
  }
}
