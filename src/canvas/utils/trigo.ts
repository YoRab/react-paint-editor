import type { Circle, Point, Rect } from '@common/types/Shapes'
type Vector = [Point, Point]

export const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180)

export const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI

export const isPointInsideRect = (rect: Rect, point: Point) => {
  return point[0] >= rect.x && point[0] <= rect.x + rect.width && point[1] >= rect.y && point[1] <= rect.y + rect.height
}

export const isCircleIntersectRect = (rect: Rect, circle: Circle) => {
  const distX = circle.x - Math.min(Math.max(circle.x, rect.x), rect.x + rect.width)
  const distY = circle.y - Math.min(Math.max(circle.y, rect.y), rect.y + rect.height)
  const distance = Math.sqrt(distX * distX + distY * distY)

  return distance <= circle.radius
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
  const rotatedPointY = pointFromOrigin[1] * Math.cos(rotation) - pointFromOrigin[0] * Math.sin(rotation)
  const rotatedPointX = pointFromOrigin[1] * Math.sin(rotation) + pointFromOrigin[0] * Math.cos(rotation)
  return [rotatedPointX + origin[0], rotatedPointY + origin[1]]
}

const sanitizeRadAngle = (angle: number) => (angle + 2 * Math.PI) % (2 * Math.PI)

export const getAngleFromVector = ({
  targetVector: [point1, point2],
  radian = true,
  originVector
}: {
  targetVector: Vector
  radian?: boolean
  originVector?: Vector
}): number => {
  const targetAngle = sanitizeRadAngle(Math.atan2(point2[1] - point1[1], point2[0] - point1[0]))

  if (originVector) {
    const [origin1, origin2] = originVector

    const originAngle = Math.atan2(origin2[1] - origin1[1], origin2[0] - origin1[0])
    const diffAngle = sanitizeRadAngle(targetAngle - originAngle)
    return radian ? diffAngle : radiansToDegrees(diffAngle)
  }
  return radian ? targetAngle : radiansToDegrees(targetAngle)
}
