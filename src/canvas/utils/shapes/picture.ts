import type { UtilsSettings } from '@canvas/constants/app'
import { addSizeAndConvertSvgToObjectUrl, fetchAndStringify, isSvg } from '@canvas/utils/file'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { fitContentInsideContainer, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Picture, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import { uniqueId } from '@common/utils/util'
import { DEFAULT_SHAPE_PICTURE } from '@editor/constants/tools'
import { getRectBorder } from './rectangle'

const buildPath = <T extends DrawableShape<'picture'>>(shape: T, settings: UtilsSettings): T => {
  return {
    ...shape,
    selection: createRecSelectionPath(undefined, shape, settings)
  }
}

export const refreshPicture = buildPath

const createPictureShape = (
  img: HTMLImageElement,
  storedSrc: string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  settings: UtilsSettings
): ShapeEntity<'picture'> => {
  const [width, height] = fitContentInsideContainer(img.width, img.height, maxPictureWidth, maxPictureHeight, true)

  return buildPath(
    {
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
    },
    settings
  )
}

const createFilePicture = (
  img: HTMLImageElement,
  resolve: (value: ShapeEntity<'picture'> | PromiseLike<ShapeEntity<'picture'>>) => void,
  file: File,
  maxPictureWidth: number,
  maxPictureHeight: number,
  settings: UtilsSettings
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
    const pictureShape = createPictureShape(img, img.src, maxPictureWidth, maxPictureHeight, settings)
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
  settings: UtilsSettings
) => {
  img.onload = () => {
    URL.revokeObjectURL(img.src)
    const pictureShape = createPictureShape(img, url, maxPictureWidth, maxPictureHeight, settings)
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

export const createPicture = (fileOrUrl: File | string, maxPictureWidth: number, maxPictureHeight: number, settings: UtilsSettings) => {
  return new Promise<ShapeEntity<'picture'>>((resolve, reject) => {
    const img = new Image()

    img.onerror = () => {
      reject(new Error('Some images could not be loaded'))
    }

    setTimeout(() => {
      reject(new Error('Timeout while loading images'))
    }, 4000)

    fileOrUrl instanceof File
      ? createFilePicture(img, resolve, fileOrUrl, maxPictureWidth, maxPictureHeight, settings)
      : createUrlPicture(img, resolve, fileOrUrl, maxPictureWidth, maxPictureHeight, settings)
  })
}

export const drawPicture = (ctx: CanvasRenderingContext2D, picture: DrawableShape<'picture'>): void => {
  if (ctx.globalAlpha === 0) return
  ctx.beginPath()
  ctx.drawImage(picture.img, picture.x, picture.y, picture.width, picture.height)
}

export const getPictureBorder = (picture: Picture, settings: UtilsSettings): Rect => getRectBorder(picture, settings)

export const translatePicture = <U extends DrawableShape<'picture'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  settings: UtilsSettings
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], settings),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], settings)
    },
    settings
  )
}

export const resizePicture = (
  cursorPosition: Point,
  originalShape: DrawableShape<'picture'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio: boolean
): DrawableShape<'picture'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(cursorPosition, originalShape, selectionMode, settings, true)
  return buildPath(
    {
      ...originalShape,
      width: Math.max(0, borderWidth - 2 * settings.selectionPadding),
      height: Math.max(0, borderHeight - 2 * settings.selectionPadding),
      x: borderX + settings.selectionPadding,
      y: borderY + settings.selectionPadding
    },
    settings
  )
}
