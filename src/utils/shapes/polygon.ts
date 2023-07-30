import _ from 'lodash/fp'
import type { Point, DrawablePolygon, Polygon, Rect } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { updateCanvasContext } from '../../utils/canvas'

export const createPolygon = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'polygon'
    settings: ToolsSettingsType<'polygon'>
  },
  cursorPosition: Point
): DrawablePolygon | undefined => {
  return {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    points: _.flow(
      _.range(0),
      _.map(() => cursorPosition)
    )(shape.settings.pointsCount.default),
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      fillColor: shape.settings.fillColor.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default,
      pointsCount: shape.settings.pointsCount.default
    }
  }
}

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon): void => {
  if (polygon.points.length < 1) return
  updateCanvasContext(ctx, polygon.style)

  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.moveTo(...polygon.points[0])
  polygon.points.slice(1).forEach(point => {
    ctx.lineTo(...point)
  })
  ctx.lineTo(...polygon.points[0])
  polygon.style?.fillColor !== 'transparent' && ctx.fill()
  polygon.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const getPolygonBorder = (polygon: Polygon, selectionPadding: number): Rect => {
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
