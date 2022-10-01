import _ from 'lodash/fp'
import { fitContentInsideContainer, roundForGrid } from '../transform'
import type {
  DrawableShape,
  Picture,
  Point,
  Rect,
  SelectionDefaultType,
  ShapeEntity
} from 'types/Shapes'
import { fetchAndStringify } from '../file'
import { DEFAULT_SHAPE_PICTURE } from 'constants/tools'
import { createRecPath, getRectBorder, resizeRect } from './rectangle'
import { SelectionModeResize } from 'types/Mode'
import { GridFormatType } from 'constants/app'
import { updateCanvasContext } from 'utils/canvas'
import { getShapeInfos } from '.'
import { createLinePath } from './line'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { createCirclePath } from './circle'

const createPictureSelectionPath = (
  rect: DrawableShape<'picture'>,
  currentScale: number
): SelectionDefaultType => {
  const { borders } = getShapeInfos(rect, 0)

  return {
    border: createRecPath(borders),
    line: createLinePath({
      points: [
        [borders.x + borders.width / 2, borders.y],
        [
          borders.x + borders.width / 2,
          borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale
        ]
      ]
    }),
    anchors: [
      createCirclePath({
        x: borders.x + borders.width / 2,
        y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
        radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
      }),
      ...SELECTION_RESIZE_ANCHOR_POSITIONS.map(anchorPosition =>
        createCirclePath({
          x: borders.x + borders.width * anchorPosition[0],
          y: borders.y + borders.height * anchorPosition[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
        })
      )
    ]
  }
}

const buildPath = <T extends DrawableShape<'picture'>>(shape: T, currentScale: number): T => {
  return {
    ...shape,
    selection: createPictureSelectionPath(shape, currentScale)
  }
}

export const refreshPicture = buildPath

export const createPicture = (
  fileOrUrl: File | string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  currentScale: number
) => {
  return new Promise<ShapeEntity<'picture'>>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const [width, height] = fitContentInsideContainer(
        img.width,
        img.height,
        maxPictureWidth,
        maxPictureHeight,
        true
      )

      const pictureShape: ShapeEntity<'picture'> = {
        toolId: DEFAULT_SHAPE_PICTURE.id,
        type: 'picture',
        id: _.uniqueId(`${'picture'}_`),
        x: (maxPictureWidth - width) / 2,
        y: (maxPictureHeight - height) / 2,
        width,
        height,
        src: fileOrUrl instanceof File ? img.src : fileOrUrl,
        img,
        rotation: 0
      }
      resolve(buildPath(pictureShape, currentScale))
    }

    img.onerror = () => {
      reject(new Error('Some images could not be loaded'))
    }
    if (fileOrUrl instanceof File) {
      img.src = URL.createObjectURL(fileOrUrl)
    } else {
      fetchAndStringify(fileOrUrl)
        .then(picData => {
          img.src = picData
        })
        .catch(() => {
          img.src = '' // to trigger onerror
        })
    }

    img.onerror = () => {
      reject(new Error('Error while loading the src'))
    }
    setTimeout(() => {
      reject(new Error('Timeout while loading the src'))
    }, 4000)
  })
}

export const drawPicture = (
  ctx: CanvasRenderingContext2D,
  picture: DrawableShape<'picture'>
): void => {
  if (ctx.globalAlpha === 0) return
  ctx.beginPath()
  ctx.drawImage(picture.img, picture.x, picture.y, picture.width, picture.height)
}

export const drawSelectionPicture = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'picture'>,
  selectionColor: string,
  selectionWidth: number,
  currentScale: number,
  withAnchors: boolean
): void => {
  if (!shape.selection) return

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / currentScale
  })

  ctx.stroke(shape.selection.border)

  if (!withAnchors || shape.locked) return

  ctx.stroke(shape.selection.line)

  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)',
    lineWidth: 2 / currentScale
  })

  for (const anchor of shape.selection.anchors) {
    ctx.fill(anchor)
    ctx.stroke(anchor)
  }
}

export const getPictureBorder = (picture: Picture, selectionPadding: number): Rect => {
  return getRectBorder(picture, selectionPadding)
}

export const translatePicture = <U extends DrawableShape<'picture'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    },
    currentScale
  )
}

export const resizePicture = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<'picture'>,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  currentScale: number,
  keepRatio: boolean
): DrawableShape<'picture'> => {
  return resizeRect(
    cursorPosition,
    canvasOffset,
    originalShape,
    selectionMode,
    selectionPadding,
    currentScale,
    keepRatio
  )
}
