import _ from 'lodash/fp'
import { fitContentInsideContainer, roundForGrid } from '../transform'
import type { DrawablePicture, Picture, Point, Rect, StoredPicture } from 'types/Shapes'
import { fetchAndStringify } from '../file'
import { DEFAULT_SHAPE_PICTURE } from 'constants/tools'
import { getRectBorder, resizeRect } from './rectangle'
import { SelectionModeResize } from 'types/Mode'
import { GridFormatType } from 'constants/app'

export const createPicture = (
  fileOrUrl: File | string,
  maxPictureWidth: number,
  maxPictureHeight: number
) => {
  return new Promise<DrawablePicture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const [width, height] = fitContentInsideContainer(
        img.width,
        img.height,
        maxPictureWidth,
        maxPictureHeight,
        true
      )

      const pictureShape: DrawablePicture = {
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
      resolve(pictureShape)
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

export const drawPicture = (ctx: CanvasRenderingContext2D, picture: DrawablePicture): void => {
  if (ctx.globalAlpha === 0) return
  ctx.beginPath()
  ctx.drawImage(picture.img, picture.x, picture.y, picture.width, picture.height)
}

export const getPictureBorder = (picture: StoredPicture, selectionPadding: number): Rect => {
  return getRectBorder(picture, selectionPadding)
}

export const translatePicture = (
  cursorPosition: Point,
  originalShape: DrawablePicture,
  originalCursorPosition: Point,
  gridFormat: GridFormatType
) => {
  return {
    ...originalShape,
    x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
    y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
  }
}

export const resizePicture = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawablePicture,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  keepRatio: boolean
): DrawablePicture => {
  return resizeRect(
    cursorPosition,
    canvasOffset,
    originalShape,
    selectionMode,
    selectionPadding,
    keepRatio
  )
}
