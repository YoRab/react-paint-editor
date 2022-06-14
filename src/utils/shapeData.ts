import _ from 'lodash/fp'
import {
  Circle,
  Ellipse,
  Line,
  StoredPicture,
  Point,
  Polygon,
  Rect,
  DrawableShape,
  Brush,
  Text
} from 'types/Shapes'

const getLineBorder = (line: Line, selectionPadding: number): Rect => {
  const x = Math.min(line.points[0][0], line.points[1][0]) - selectionPadding
  const width = Math.abs(line.points[0][0] - line.points[1][0]) + selectionPadding * 2
  const y = Math.min(line.points[0][1], line.points[1][1]) - selectionPadding
  const height = Math.abs(line.points[0][1] - line.points[1][1]) + selectionPadding * 2
  return { x, width, y, height }
}

const getBrushBorder = (brush: Brush, selectionPadding: number): Rect => {
  const brushPoints = _.flatMap(points => points, brush.points)
  const minX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.min,
    _.add(-selectionPadding)
  )(brushPoints)
  const maxX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.max,
    _.add(selectionPadding)
  )(brushPoints)
  const minY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.min,
    _.add(-selectionPadding)
  )(brushPoints)
  const maxY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.max,
    _.add(selectionPadding)
  )(brushPoints)

  return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

const getPolygonBorder = (polygon: Polygon, selectionPadding: number): Rect => {
  const minX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.min,
    _.add(-selectionPadding)
  )(polygon.points)
  const maxX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.max,
    _.add(selectionPadding)
  )(polygon.points)
  const minY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.min,
    _.add(-selectionPadding)
  )(polygon.points)
  const maxY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.max,
    _.add(selectionPadding)
  )(polygon.points)

  return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

const getCurveBorder = getPolygonBorder

const getRectBorder = (rect: Rect, selectionPadding: number): Rect => {
  return {
    x: rect.x - selectionPadding,
    width: rect.width + selectionPadding * 2,
    y: rect.y - selectionPadding,
    height: rect.height + selectionPadding * 2
  }
}

const getTextBorder = (text: Text, selectionPadding: number): Rect => {
  return {
    x: text.x - selectionPadding,
    width: text.width + selectionPadding * 2,
    y: text.y - selectionPadding,
    height: text.height + selectionPadding * 2
  }
}

const getPictureBorder = (picture: StoredPicture, selectionPadding: number): Rect => {
  return getRectBorder(picture, selectionPadding)
}

const getCircleBorder = (circle: Circle, selectionPadding: number): Rect => {
  return {
    x: circle.x - circle.radius - selectionPadding,
    width: (circle.radius + selectionPadding) * 2,
    y: circle.y - circle.radius - selectionPadding,
    height: (circle.radius + selectionPadding) * 2
  }
}

const getEllipseBorder = (ellipse: Ellipse, selectionPadding: number): Rect => {
  return {
    x: ellipse.x - ellipse.radiusX - selectionPadding,
    width: (ellipse.radiusX + selectionPadding) * 2,
    y: ellipse.y - ellipse.radiusY - selectionPadding,
    height: (ellipse.radiusY + selectionPadding) * 2
  }
}

const getShapeBorders = (marker: DrawableShape, selectionPadding: number): Rect => {
  switch (marker.type) {
    case 'brush':
      return getBrushBorder(marker, selectionPadding)
    case 'line':
      return getLineBorder(marker, selectionPadding)
    case 'polygon':
      return getPolygonBorder(marker, selectionPadding)
    case 'curve':
      return getCurveBorder(marker, selectionPadding)
    case 'circle':
      return getCircleBorder(marker, selectionPadding)
    case 'ellipse':
      return getEllipseBorder(marker, selectionPadding)
    case 'rect':
    case 'square':
      return getRectBorder(marker, selectionPadding)
    case 'text':
      return getTextBorder(marker, selectionPadding)
    case 'picture':
      return getPictureBorder(marker, selectionPadding)
  }
  return { x: 0, y: 0, width: 0, height: 0 }
}

const getShapeCenter = (borders: Rect): Point => {
  return [borders.x + borders.width / 2, borders.y + borders.height / 2]
}

export const getShapeInfos = (shape: DrawableShape, selectionPadding: number) => {
  const borders = getShapeBorders(shape, selectionPadding)
  const center = getShapeCenter(borders)
  return { borders, center }
}
