import { Point, Rect } from 'types/Shapes'

export const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180)

export const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI

export const isPointInsideRect = (rect: Rect, point: Point) => {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  )
}

export const rotatePoint = ({
  origin = [0, 0],
  point,
  rotation
}: {
  origin?: Point
  point: Point
  rotation: number
}): Point => {
  const pointFromOrigin = [point[0] - origin[0], point[1] - origin[1]]
  const rotatedPointY =
    pointFromOrigin[1] * Math.cos(rotation) - pointFromOrigin[0] * Math.sin(rotation)
  const rotatedPointX =
    pointFromOrigin[1] * Math.sin(rotation) + pointFromOrigin[0] * Math.cos(rotation)
  return [rotatedPointX + origin[0], rotatedPointY + origin[1]]
}
