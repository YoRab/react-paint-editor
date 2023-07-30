import _ from 'lodash/fp'
import { fitContentInsideContainer } from '../transform'
import type { DrawablePicture, Picture, Point, Rect, StoredPicture } from '../../types/Shapes'
import { addSizeAndConvertSvgToObjectUrl, fetchAndStringify, isSvg } from '../file'
import { DEFAULT_SHAPE_PICTURE } from '../../constants/tools'
import { updateCanvasContext } from '../../utils/canvas'
import { getRectBorder, resizeRect } from './rectangle'
import { SelectionModeResize } from '../../types/Mode'

const createPictureShape = (
  img: HTMLImageElement,
  storedSrc: string,
  maxPictureWidth: number,
  maxPictureHeight: number
): DrawablePicture => {
  const [width, height] = fitContentInsideContainer(
    img.width,
    img.height,
    maxPictureWidth,
    maxPictureHeight,
    true
  )

  return {
    toolId: DEFAULT_SHAPE_PICTURE.id,
    type: 'picture',
    id: _.uniqueId(`${'picture'}_`),
    x: (maxPictureWidth - width) / 2,
    y: (maxPictureHeight - height) / 2,
    width,
    height,
    src: storedSrc,
    img,
    rotation: 0
  }
}

const createFilePicture = (
  img: HTMLImageElement,
  resolve: (value: DrawablePicture | PromiseLike<DrawablePicture>) => void,
  file: File,
  maxPictureWidth: number,
  maxPictureHeight: number
) => {

  const initSrc = URL.createObjectURL(file)
  img.onload = async () => {
    URL.revokeObjectURL(img.src)
    if (isSvg(file) && !img.width && !img.height) {
      const svgFileContent = await file.text()
      const svgUrl = addSizeAndConvertSvgToObjectUrl(svgFileContent)

      if (initSrc === img.src) {
        img.src = svgUrl
        return
      }
    }
    const pictureShape = createPictureShape(img, img.src, maxPictureWidth, maxPictureHeight)
    resolve(pictureShape)
  }
  img.src = initSrc
}

const createUrlPicture = (
  img: HTMLImageElement,
  resolve: (value: DrawablePicture | PromiseLike<DrawablePicture>) => void,
  url: string,
  maxPictureWidth: number,
  maxPictureHeight: number
) => {
  img.onload = () => {
    URL.revokeObjectURL(img.src)
    const pictureShape = createPictureShape(img, url, maxPictureWidth, maxPictureHeight)
    resolve(pictureShape)
  }

  fetchAndStringify(url)
    .then(picData => {
      img.src = picData
    })
    .catch(() => {
      img.src = '' // trigger onerror
    })
}

export const createPicture = (
  fileOrUrl: File | string,
  maxPictureWidth: number,
  maxPictureHeight: number
) => {
  return new Promise<DrawablePicture>((resolve, reject) => {
    const img = new Image()

    img.onerror = () => {
      reject(new Error('Some images could not be loaded'))
    }

    setTimeout(() => {
      reject(new Error('Timeout while loading images'))
    }, 4000)

    fileOrUrl instanceof File
      ? createFilePicture(img, resolve, fileOrUrl, maxPictureWidth, maxPictureHeight)
      : createUrlPicture(img, resolve, fileOrUrl, maxPictureWidth, maxPictureHeight)
  })
}

export const drawPicture = (ctx: CanvasRenderingContext2D, picture: Picture): void => {
  updateCanvasContext(ctx, picture.style)
  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.drawImage(picture.img, picture.x, picture.y, picture.width, picture.height)
}

export const getPictureBorder = (picture: StoredPicture, selectionPadding: number): Rect =>
  getRectBorder(picture, selectionPadding)

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
