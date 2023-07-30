import _ from 'lodash/fp'
import type { Point, DrawableCurve, Curve } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { updateCanvasContext } from '../../utils/canvas'
import { getPolygonBorder } from './polygon'

export const createCurve = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'curve'
    settings: ToolsSettingsType<'curve'>
  },
  cursorPosition: Point
): DrawableCurve | undefined => {
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

export const drawCurve = (ctx: CanvasRenderingContext2D, curve: Curve): void => {
  if (curve.points.length < 3) return
  updateCanvasContext(ctx, curve.style)

  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.moveTo(...curve.points[0])
  for (let i = 1; i < curve.points.length - 1; i++) {
    ctx.quadraticCurveTo(
      ...curve.points[i],
      curve.points.length - 2 === i
        ? curve.points[i + 1][0]
        : (curve.points[i + 1][0] - curve.points[i][0]) / 2 + curve.points[i][0],
      curve.points.length - 2 === i
        ? curve.points[i + 1][1]
        : (curve.points[i + 1][1] - curve.points[i][1]) / 2 + curve.points[i][1]
    )
  }
  curve.style?.fillColor !== 'transparent' && ctx.fill()
  curve.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const getCurveBorder = getPolygonBorder
