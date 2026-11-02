import type { PictureSrcResolver, UtilsSettings } from '@canvas/constants/app'
import { PICTURE_TOOL_ID } from '@canvas/constants/tools'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { createDetachedContext, isVisibleColor } from '@canvas/utils/canvas'
import { addSizeAndConvertSvgToObjectUrl, isSvg, loadPicture, readFileAsDataUrl } from '@canvas/utils/file'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { fitContentInsideContainer } from '@canvas/utils/transform'
import { createShapeId } from '@canvas/utils/util'
import { type GroupResizeContext, getMirroredRotation, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'
import { createRecPath, getComputedShapeInfos, getCornerRadius } from './path'
import { getRectBorder } from './rectangle'

const buildPath = <T extends DrawableShape<'picture'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'picture'> => {
  const computed = getComputedShapeInfos(shape, getRectBorder, settings)
  const path = createRecPath(shape, getCornerRadius(shape))
  return {
    ...shape,
    path,
    computed
  }
}

export const refreshPicture = buildPath

/** Proportions of the image of a picture, known once it is loaded: the ones of a sticker are known only then */
export const getPictureRatio = (img: HTMLImageElement): number | undefined =>
  img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : undefined

const createPictureShape = (
  img: HTMLImageElement,
  storedSrc: string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  settings: UtilsSettings,
  tool: CustomTool | undefined,
  center: Point | undefined
): ShapeEntity<'picture'> => {
  const [width, height] = fitContentInsideContainer(img.width, img.height, maxPictureWidth, maxPictureHeight, true)
  const [centerX, centerY] = center ?? [
    -settings.canvasOffset[0] + settings.canvasSize.realWidth / settings.canvasZoom / 2,
    -settings.canvasOffset[1] + settings.canvasSize.realHeight / settings.canvasZoom / 2
  ]
  return buildPath(
    {
      toolId: tool?.id ?? PICTURE_TOOL_ID,
      type: 'picture',
      id: createShapeId('picture'),
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      ratio: height === 0 ? 1 : width / height,
      src: storedSrc,
      img,
      style: getToolDefaultStyle(tool)
    },
    settings
  )
}

/**
 * A sticker drawn by a press, when its tool gives a source: its image is the one loaded for its tool, so that the drag
 * starts at once and keeps the proportions of the image. Its box is empty, like the one of the other shapes drawn by a
 * drag, and it has no ratio yet when its image is not loaded: see fitPictureToImage
 */
export const createSticker = (
  tool: Extract<CustomTool, { type: 'picture' }>,
  cursorPosition: Point,
  settings: UtilsSettings,
  /** Image of the tool, shared by its stickers: without it, the image of this sticker alone is loaded */
  image?: HTMLImageElement
): ShapeEntity<'picture'> | undefined => {
  if (!tool.src) return undefined
  const img = image ?? new Image()
  const ratio = tool.ratio ?? getPictureRatio(img)
  return buildPath(
    {
      toolId: tool.id,
      type: 'picture',
      id: createShapeId('picture'),
      x: cursorPosition[0],
      y: cursorPosition[1],
      width: 0,
      height: 0,
      ...(ratio === undefined ? {} : { ratio }),
      src: tool.src,
      img,
      style: getToolDefaultStyle(tool)
    },
    settings
  )
}

/**
 * The picture, with the proportions of its image once it is loaded: a sticker drawn before its image is loaded takes
 * them, and its box is fitted inside the one its drag gave. A picture which already has a ratio, given by the consumer,
 * taken from its box or from its tool, keeps it: only its image was missing
 */
export const fitPictureToImage = (shape: ShapeEntity<'picture'>, settings: UtilsSettings): ShapeEntity<'picture'> => {
  const ratio = getPictureRatio(shape.img)
  if (ratio === undefined || shape.ratio !== undefined) return { ...shape }
  // an empty box is given its default size by sizeShapeOnClick, from the ratio
  if (!shape.width || !shape.height) return { ...shape, ratio }
  const [width, height] = fitContentInsideContainer(shape.img.naturalWidth, shape.img.naturalHeight, shape.width, shape.height, true)
  return buildPath(
    { ...shape, ratio, width, height, x: shape.x + (shape.width - width) / 2, y: shape.y + (shape.height - height) / 2 },
    settings
  )
}

/** Loads the image of a new picture, and returns the source kept in its shape: the URL, or the content of the file */
const loadNewPicture = async (
  img: HTMLImageElement,
  fileOrUrl: File | string,
  resolvePictureSrc: PictureSrcResolver | undefined
): Promise<string> => {
  if (!(fileOrUrl instanceof File)) {
    await loadPicture(img, fileOrUrl, resolvePictureSrc)
    return fileOrUrl
  }
  if (isSvg(fileOrUrl)) {
    const svgFileContent = await fileOrUrl.text()
    await loadPicture(img, addSizeAndConvertSvgToObjectUrl(svgFileContent))
    return svgFileContent
  }
  // the content of the file is the source of the picture, read while its image loads: the image would else be encoded
  // in PNG on its first export, which freezes the page for a large photo
  const [dataUrl] = await Promise.all([readFileAsDataUrl(fileOrUrl), loadPicture(img, URL.createObjectURL(fileOrUrl))])
  return dataUrl
}

export const createPicture = async (
  fileOrUrl: File | string,
  maxPictureWidth: number,
  maxPictureHeight: number,
  settings: UtilsSettings,
  resolvePictureSrc: PictureSrcResolver | undefined,
  /** Picture tool, giving its default style to the picture */
  tool: CustomTool | undefined,
  /** Center of the picture in the drawing, the center of the visible area by default */
  center?: Point
): Promise<ShapeEntity<'picture'>> => {
  const img = new Image()
  const storedSrc = await loadNewPicture(img, fileOrUrl, resolvePictureSrc)
  return createPictureShape(img, storedSrc, maxPictureWidth, maxPictureHeight, settings, tool, center)
}

/**
 * Reduced copies of the images, by level: the level n is the image halved n times. Drawn much smaller than it is, an image
 * is resampled from its full size at each frame by some browsers (Firefox, Safari), slower and grainier: it is drawn from
 * its smallest copy at least as large as it is drawn. A copy is made once, the first time it is needed, and is freed with
 * its image
 */
const reducedImages = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>()

/** Number of times the image can be halved and stay at least as large as the picture, in pixels of the canvas */
const getReductionLevel = (ctx: CanvasRenderingContext2D, picture: ShapeEntity<'picture'>): number => {
  const { naturalWidth, naturalHeight } = picture.img
  const { a, b, c, d } = ctx.getTransform()
  const drawnWidth = picture.width * Math.hypot(a, b)
  const drawnHeight = picture.height * Math.hypot(c, d)
  if (!naturalWidth || !naturalHeight || drawnWidth <= 0 || drawnHeight <= 0) return 0
  return Math.max(0, Math.floor(Math.log2(Math.min(naturalWidth / drawnWidth, naturalHeight / drawnHeight))))
}

const getReducedImage = (img: HTMLImageElement, level: number): CanvasImageSource => {
  if (level === 0) return img
  const levels = reducedImages.get(img) ?? new Map<number, HTMLCanvasElement>()
  const reduced = levels.get(level)
  if (reduced) return reduced

  const reducedCtx = createDetachedContext()
  if (!reducedCtx) return img
  reducedCtx.canvas.width = Math.ceil(img.naturalWidth / 2 ** level)
  reducedCtx.canvas.height = Math.ceil(img.naturalHeight / 2 ** level)
  reducedCtx.imageSmoothingQuality = 'high'
  reducedCtx.drawImage(img, 0, 0, reducedCtx.canvas.width, reducedCtx.canvas.height)
  // a lost context empties the canvas: the copy is made again
  reducedCtx.canvas.addEventListener('contextlost', () => levels.delete(level))
  levels.set(level, reducedCtx.canvas)
  reducedImages.set(img, levels)
  return reducedCtx.canvas
}

/** The border of a picture is drawn only with a stroke color: the pictures had no border before */
export const hasPictureBorder = (picture: Pick<ShapeEntity<'picture'>, 'style'>) => isVisibleColor(picture.style?.strokeColor)

/** Draws the image of a picture, cut at its rounded corners, then its border */
export const drawPicture = (ctx: CanvasRenderingContext2D, picture: ShapeEntity<'picture'>): void => {
  if (ctx.globalAlpha === 0) return
  const image = getReducedImage(picture.img, getReductionLevel(ctx, picture))
  const isRounded = getCornerRadius(picture) > 0
  const hasBorder = hasPictureBorder(picture)
  // the clip and the flip are undone before the border, the caller restores the context after the shape
  const restoresBeforeBorder = hasBorder && (isRounded || !!picture.flipX || !!picture.flipY)
  if (restoresBeforeBorder) ctx.save()
  if (isRounded) ctx.clip(picture.path)
  ctx.beginPath()
  ctx.scale(picture.flipX ? -1 : 1, picture.flipY ? -1 : 1)
  ctx.drawImage(
    image,
    picture.flipX ? -picture.x - picture.width : picture.x,
    picture.flipY ? -picture.y - picture.height : picture.y,
    picture.width,
    picture.height
  )
  if (restoresBeforeBorder) ctx.restore()
  if (hasBorder) ctx.stroke(picture.path)
}

export const resizePicture = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'picture'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  resizeFromCenter: boolean
): ShapeEntity<'picture'> => {
  // a picture keeps its proportions: the ones of its image, known as soon as a sticker is loaded. Its drag is square
  // until then, and the picture is fitted to its image once it is loaded (fitPictureToImage)
  const ratio = originalShape.ratio ?? getPictureRatio(originalShape.img)
  const { borderX, borderHeight, borderY, borderWidth, isXinverted, isYinverted } = resizeRectSelection(
    cursorPosition,
    { ...originalShape, ratio: ratio ?? 1 },
    selectionMode,
    settings,
    true,
    resizeFromCenter
  )

  const width = Math.max(0, borderWidth - 2 * settings.selectionPadding)
  const height = Math.max(0, borderHeight - 2 * settings.selectionPadding)

  return buildPath(
    {
      ...originalShape,
      ...(ratio === undefined ? {} : { ratio }),
      width,
      height,
      x: borderX + settings.selectionPadding,
      y: borderY + settings.selectionPadding,
      flipX: isXinverted ? !originalShape.flipX : !!originalShape.flipX,
      flipY: isYinverted ? !originalShape.flipY : !!originalShape.flipY
    },
    settings
  )
}

export const resizePictureInGroup = (shape: ShapeEntity<'picture'>, groupCtx: GroupResizeContext): ShapeEntity<'picture'> => {
  const { isXinverted, isYinverted, settings, widthMultiplier, heightMultiplier } = groupCtx
  const pos = getShapePositionInNewBorder(shape, groupCtx)
  const newWidth = (shape.width === 0 || shape.height === 0 ? (shape.ratio ?? 1) : shape.width) * widthMultiplier
  const newHeight = (shape.width === 0 || shape.height === 0 ? (shape.ratio ?? 1) : shape.height) * heightMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newWidth, newHeight)
  return buildPath(
    {
      ...shape,
      width: newWidth,
      height: newHeight,
      x: newCenter[0] - newWidth / 2,
      y: newCenter[1] - newHeight / 2,
      flipX: isXinverted ? !shape.flipX : !!shape.flipX,
      flipY: isYinverted ? !shape.flipY : !!shape.flipY,
      rotation: getMirroredRotation(shape.rotation, groupCtx)
    },
    settings
  )
}
