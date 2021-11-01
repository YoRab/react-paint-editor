import { SELECTION_PADDING } from 'constants/shapes'
import _ from 'lodash/fp'
import { Circle, Ellipse, Line, Picture, Point, Polygon, Rect, DrawableShape } from 'types/Shapes'
import { getPointPositionBeforeCanvasTransformation } from './intersect'

const getLineBorder = (line: Line): Rect => {
  const x = Math.min(line.points[0][0], line.points[1][0]) - SELECTION_PADDING
  const width = Math.abs(line.points[0][0] - line.points[1][0]) + SELECTION_PADDING * 2
  const y = Math.min(line.points[0][1], line.points[1][1]) - SELECTION_PADDING
  const height = Math.abs(line.points[0][1] - line.points[1][1]) + SELECTION_PADDING * 2
  return { x, width, y, height }
}

const getPolygonBorder = (polygon: Polygon): Rect => {
  const minX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.min,
    _.add(-SELECTION_PADDING)
  )(polygon.points)
  const maxX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.max,
    _.add(SELECTION_PADDING)
  )(polygon.points)
  const minY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.min,
    _.add(-SELECTION_PADDING)
  )(polygon.points)
  const maxY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.max,
    _.add(SELECTION_PADDING)
  )(polygon.points)

  return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

const getRectBorder = (rect: Rect): Rect => {
  return {
    x: rect.x - SELECTION_PADDING,
    width: rect.width + SELECTION_PADDING * 2,
    y: rect.y - SELECTION_PADDING,
    height: rect.height + SELECTION_PADDING * 2
  }
}

const getPictureBorder = (picture: Picture): Rect => {
  return getRectBorder(picture)
}

const getCircleBorder = (circle: Circle): Rect => {
  return {
    x: circle.x - circle.radius - SELECTION_PADDING,
    width: (circle.radius + SELECTION_PADDING) * 2,
    y: circle.y - circle.radius - SELECTION_PADDING,
    height: (circle.radius + SELECTION_PADDING) * 2
  }
}

const getEllipseBorder = (ellipse: Ellipse): Rect => {
  return {
    x: ellipse.x - ellipse.radiusX - SELECTION_PADDING,
    width: (ellipse.radiusX + SELECTION_PADDING) * 2,
    y: ellipse.y - ellipse.radiusY - SELECTION_PADDING,
    height: (ellipse.radiusY + SELECTION_PADDING) * 2
  }
}

const getShapeBorders = (marker: DrawableShape): Rect => {
  switch (marker.type) {
    case 'line':
      return getLineBorder(marker)
    case 'polygon':
      return getPolygonBorder(marker)
    case 'circle':
      return getCircleBorder(marker)
    case 'ellipse':
      return getEllipseBorder(marker)
    case 'rect':
      return getRectBorder(marker)
    case 'picture':
      return getPictureBorder(marker)
  }
  return { x: 0, y: 0, width: 0, height: 0 }
}

const getShapeCenter = (borders: Rect): Point => {
  return [borders.x + borders.width / 2, borders.y + borders.height / 2]
}

export const getShapeInfos = (shape: DrawableShape) => {
  const borders = getShapeBorders(shape)
  const center = getShapeCenter(borders)
  return { borders, center }
}
