import { fitContentInsideContainer, roundForGrid } from '../transform'
import type {
  DrawableShape,
  Picture,
  Point,
  Rect,
  ShapeEntity
} from '../../types/Shapes'
import { addSizeAndConvertSvgToObjectUrl, fetchAndStringify, isSvg } from '../file'
import { DEFAULT_SHAPE_PICTURE } from '../../constants/tools'
import { getRectBorder, resizeRect } from './rectangle'
import { SelectionModeResize } from '../../types/Mode'
import { GridFormatType } from '../../constants/app'
import { createRecSelectionPath } from '../../utils/selection/rectSelection'
import { uniqueId } from '../../utils/util'

const buildPath = <T extends DrawableShape<'picture'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    selection: createRecSelectionPath(shape, currentScale, selectionPadding)
  }
}

export const refreshPicture = buildPath

const createPictureShape = (
  img: HTMLImageElement,
  storedSrc: string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  currentScale: number,
  selectionPadding: number
): ShapeEntity<'picture'> => {
  const [width, height] = fitContentInsideContainer(
    img.width,
    img.height,
    maxPictureWidth,
    maxPictureHeight,
    true
  )

  return buildPath({
    toolId: DEFAULT_SHAPE_PICTURE.id,
    type: 'picture',
    id: uniqueId(`${'picture'}_`),
    x: (maxPictureWidth - width) / 2,
    y: (maxPictureHeight - height) / 2,
    width,
    height,
    src: storedSrc,
    img,
    rotation: 0
  }, currentScale, selectionPadding)
}

const createFilePicture = (
  img: HTMLImageElement,
  resolve: (value: ShapeEntity<'picture'> | PromiseLike<ShapeEntity<'picture'>>) => void,
  file: File,
  maxPictureWidth: number,
  maxPictureHeight: number,
  currentScale: number,
  selectionPadding: number
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
    const pictureShape = createPictureShape(img, img.src, maxPictureWidth, maxPictureHeight, currentScale, selectionPadding)
    resolve(pictureShape)
  }
  img.src = initSrc
}

const createUrlPicture = (
  img: HTMLImageElement,
  resolve: (value: ShapeEntity<'picture'> | PromiseLike<ShapeEntity<'picture'>>) => void,
  url: string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  currentScale: number,
  selectionPadding: number
) => {
  img.onload = () => {
    URL.revokeObjectURL(img.src)
    const pictureShape = createPictureShape(img, url, maxPictureWidth, maxPictureHeight, currentScale, selectionPadding)
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
  maxPictureHeight: number,
  currentScale: number,
  selectionPadding: number
) => {
  return new Promise<ShapeEntity<'picture'>>((resolve, reject) => {
    const img = new Image()

    img.onerror = () => {
      reject(new Error('Some images could not be loaded'))
    }

    setTimeout(() => {
      reject(new Error('Timeout while loading images'))
    }, 4000)

    fileOrUrl instanceof File
      ? createFilePicture(img, resolve, fileOrUrl, maxPictureWidth, maxPictureHeight, currentScale, selectionPadding)
      : createUrlPicture(img, resolve, fileOrUrl, maxPictureWidth, maxPictureHeight, currentScale, selectionPadding)
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

export const getPictureBorder = (picture: Picture, selectionPadding: number): Rect =>
  getRectBorder(picture, selectionPadding)

export const translatePicture = <U extends DrawableShape<'picture'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    },
    currentScale,
    selectionPadding
  )
}

export const resizePicture = (
  cursorPosition: Point,
  originalShape: DrawableShape<'picture'>,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number,
  keepRatio: boolean
): DrawableShape<'picture'> => {
  return resizeRect(
    cursorPosition,
    originalShape,
    selectionMode,
    gridFormat,
    selectionPadding,
    currentScale,
    keepRatio
  )
}
