import { UtilsSettings } from 'src/constants/app'
import { PICTURE_DEFAULT_SIZE } from '../constants/picture'
import { ShapeTypeArray } from '../constants/shapes'
import type { DrawableShape, ExportDataType, Point, ShapeEntity } from '../types/Shapes'
import { compact } from '../utils/array'
import { initCanvasContext } from './canvas'
import { addDefaultAndTempShapeProps, buildDataToExport } from './data'
import { drawShape } from './shapes'

export const addSizeAndConvertSvgToObjectUrl = (svgFileContent: string) => {
	const parser = new DOMParser()
	const result = parser.parseFromString(svgFileContent, 'text/xml')
	const inlineSVG = result.getElementsByTagName('svg')[0]

	const svgWidth = inlineSVG.getAttribute('width')
	const svgHeight = inlineSVG.getAttribute('height')

	let svgContentToConvert: string
	if (svgWidth || svgHeight) {
		svgContentToConvert = svgFileContent
	} else {
		const viewBox = inlineSVG.getAttribute('viewBox') ?? `0 0 ${PICTURE_DEFAULT_SIZE} ${PICTURE_DEFAULT_SIZE}`
		const [, , width, height] = viewBox.split(' ')
		inlineSVG.setAttribute('width', width ?? PICTURE_DEFAULT_SIZE)
		inlineSVG.setAttribute('height', height ?? PICTURE_DEFAULT_SIZE)
		svgContentToConvert = new XMLSerializer().serializeToString(inlineSVG)
	}
	const blob = new Blob([svgContentToConvert], { type: 'image/svg+xml' })
	return URL.createObjectURL(blob)
}

export const isSvg = (fileOrUrl: File | string) => (fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl).includes('.svg')

export const fetchAndStringify = (url: string) => {
	return isSvg(url)
		? fetch(url)
				.then(response => response.text())
				.then(svgFileContent => addSizeAndConvertSvgToObjectUrl(svgFileContent))
		: fetch(url)
				.then(response => response.blob())
				.then(myBlob => URL.createObjectURL(myBlob))
}

export const downloadFile = (content: string, fileName: string) => {
	const a = document.createElement('a')
	a.href = content
	a.download = fileName
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
}

export const getBase64Image = (img: HTMLImageElement) => {
	const canvas = document.createElement('canvas')
	canvas.width = img.width
	canvas.height = img.height
	const ctx = canvas.getContext('2d')
	if (!ctx) return ''
	ctx.drawImage(img, 0, 0)
	const dataURL = canvas.toDataURL('image/png')
	return dataURL
}

const encodeObjectToString = (objectToEncode: unknown) => {
	return `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(objectToEncode))}`
}

export const getCanvasImage = (shapes: DrawableShape[], canvasOffset: Point, width: number, height: number, settings: UtilsSettings) => {
	const newCanvas = document.createElement('canvas')
	newCanvas.width = width
	newCanvas.height = height
	const ctx = newCanvas.getContext('2d')
	if (!ctx) return ''
	ctx.clearRect(0, 0, width, height)
	initCanvasContext(ctx)
	for (let i = shapes.length - 1; i >= 0; i--) {
		drawShape(ctx, shapes[i], canvasOffset, settings)
	}
	return newCanvas.toDataURL('image/png')
}

export const encodeShapesInString = (shapes: DrawableShape[], width: number, height: number) => {
	const dataToExport = buildDataToExport(shapes, width, height)
	return encodeObjectToString(dataToExport)
}

export const decodeJson = async (file: File) => {
	return new Promise<unknown>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = event => {
			const result = event.target?.result
			if (!result) return reject('Impossible de récupérer les données du fichier')
			const json = JSON.parse(result as string)
			resolve(json)
		}
		reader.readAsText(file)
	})
}

export const decodeImportedData = async (shapesForJson: ExportDataType, settings: UtilsSettings) => {
	if (!shapesForJson.shapes) return []
	const promisesArray: Promise<void>[] = []

	const shapes: ShapeEntity[] = compact(
		shapesForJson.shapes.map(shape => {
			if (!shape || !ShapeTypeArray.includes(shape.type)) return null
			if (shape.type === 'picture') {
				const img = new Image()
				const newPromise = new Promise<void>((resolve, reject) => {
					img.onload = () => {
						URL.revokeObjectURL(img.src)
						resolve()
					}

					img.onerror = () => {
						reject(new Error('Some images could not be loaded'))
					}
				})
				promisesArray.push(newPromise)
				if (shape.src.startsWith('http')) {
					fetchAndStringify(shape.src)
						.then(picData => {
							img.src = picData
						})
						.catch(() => {
							img.src = '' // to trigger onerror
						})
				} else {
					img.src = shape.src
				}

				return addDefaultAndTempShapeProps(
					{
						...shape,
						img
					},
					settings
				)
			}
			return addDefaultAndTempShapeProps(shape, settings)
		})
	)

	await Promise.all(promisesArray)
	return shapes
}
