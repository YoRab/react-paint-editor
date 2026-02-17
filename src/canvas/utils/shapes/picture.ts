import type { UtilsSettings } from '@canvas/constants/app'
import { addSizeAndConvertSvgToObjectUrl, fetchAndStringify, isSvg } from '@canvas/utils/file'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { fitContentInsideContainer } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import { uniqueId } from '@common/utils/util'
import { DEFAULT_SHAPE_PICTURE } from '@editor/constants/tools'
import { type GroupResizeContext, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'
import { getComputedShapeInfos } from './path'
import { getRectBorder } from './rectangle'

export const getComputedPicture = (picture: DrawableShape<'picture'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(picture, getRectBorder, settings)
}

const buildPath = <T extends DrawableShape<'picture'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'picture'> => {
  const computed = getComputedPicture(shape, settings)
  return {
    ...shape,
    selection: createRecSelectionPath(undefined, computed, settings),
    computed
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
      x: -settings.canvasOffset[0] + settings.canvasSize.realWidth / settings.canvasZoom / 2 - width / 2,
      y: -settings.canvasOffset[1] + settings.canvasSize.realHeight / settings.canvasZoom / 2 - height / 2,
      width,
      height,
      src: storedSrc,
      img
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
): void => {
  if (isSvg(file)) {
    file.text().then(svgFileContent => {
      const svgUrl = addSizeAndConvertSvgToObjectUrl(svgFileContent)
      img.onload = async () => {
        URL.revokeObjectURL(img.src)
        const pictureShape = createPictureShape(img, svgFileContent, maxPictureWidth, maxPictureHeight, settings)
        resolve(pictureShape)
      }
      img.src = svgUrl
    })
  } else {
    img.onload = async () => {
      URL.revokeObjectURL(img.src)
      const pictureShape = createPictureShape(img, img.src, maxPictureWidth, maxPictureHeight, settings)
      resolve(pictureShape)
    }
    img.src = URL.createObjectURL(file)
  }
}

const createUrlPicture = (
  img: HTMLImageElement,
  resolve: (value: ShapeEntity<'picture'> | PromiseLike<ShapeEntity<'picture'>>) => void,
  url: string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  settings: UtilsSettings
): void => {
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

export const createPicture = (
  fileOrUrl: File | string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  settings: UtilsSettings
): Promise<ShapeEntity<'picture'>> => {
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

export const drawPicture = (ctx: CanvasRenderingContext2D, picture: ShapeEntity<'picture'>): void => {
  if (ctx.globalAlpha === 0) return
  ctx.beginPath()
  ctx.drawImage(picture.img, picture.x, picture.y, picture.width, picture.height)
}

export const resizePicture = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'picture'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  resizeFromCenter: boolean
): ShapeEntity<'picture'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    true,
    resizeFromCenter
  )
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

export const resizePictureInGroup = (
  shape: ShapeEntity<'picture'>,
  group: SelectionType & { type: 'group' },
  groupCtx: GroupResizeContext
): ShapeEntity<'picture'> => {
  const pos = getShapePositionInNewBorder(shape, group, groupCtx)
  const newWidth = shape.width * groupCtx.widthMultiplier
  const newHeight = shape.height * groupCtx.heightMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newWidth, newHeight)
  return buildPath(
    {
      ...shape,
      width: newWidth,
      height: newHeight,
      x: newCenter[0] - newWidth / 2,
      y: newCenter[1] - newHeight / 2
    },
    groupCtx.settings
  )
}
