import { DrawableShapeJson, Point } from '../types/Shapes'
import _ from 'lodash/fp'

export const migrateShapesV065 = (shapes: DrawableShapeJson[]) => {
  return shapes?.map(shape => {
    if (!shape.translation) {
      return shape
    }
    const translation = shape.translation
    switch (shape.type) {
      case 'rect':
      case 'square':
      case 'ellipse':
      case 'circle':
      case 'picture':
        return {
          ..._.omit(['translation'], shape),
          x: shape.x + translation[0],
          y: shape.y + translation[1]
        }
      case 'line':
        return {
          ..._.omit(['translation'], shape),
          points: shape.points.map(([x, y]) => [x + translation[0], y + translation[1]]) as [
            Point,
            Point
          ]
        }
      case 'polygon':
      case 'curve':
        return {
          ..._.omit(['translation'], shape),
          points: shape.points.map(([x, y]) => [x + translation[0], y + translation[1]]) as Point[]
        }
      case 'brush':
        return {
          ..._.omit(['translation'], shape),
          points: shape.points.map(coord =>
            coord.map(([x, y]) => [x + translation[0], y + translation[1]])
          ) as Point[][]
        }
    }
  })
}
