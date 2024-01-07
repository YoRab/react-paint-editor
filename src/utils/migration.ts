import { DrawableShapeJson, Point } from '../types/Shapes'

export const migrateShapesV065 = (shapes: DrawableShapeJson[]): (DrawableShapeJson | undefined)[] => {
  return shapes?.map(shape => {
    if (!shape.translation) {
      return shape
    }
    const { translation, ...shapeWithoutTranslation } = shape
    switch (shapeWithoutTranslation.type) {
      case 'rect':
      case 'square':
      case 'ellipse':
      case 'circle':
      case 'picture':
        return {
          ...shapeWithoutTranslation,
          x: shapeWithoutTranslation.x + translation[0],
          y: shapeWithoutTranslation.y + translation[1]
        }
      case 'line':
        return {
          ...shapeWithoutTranslation,
          points: shapeWithoutTranslation.points.map(([x, y]) => [x + translation[0], y + translation[1]]) as [Point, Point]
        }
      case 'polygon':
      case 'curve':
        return {
          ...shapeWithoutTranslation,
          points: shapeWithoutTranslation.points.map(([x, y]) => [x + translation[0], y + translation[1]] as Point)
        }
      case 'brush':
        return {
          ...shapeWithoutTranslation,
          points: shapeWithoutTranslation.points.map(coord =>
            coord.map(([x, y]) => [x + translation[0], y + translation[1]] as Point)
          )
        }
    }
  })
}
