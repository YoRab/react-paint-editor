import type { DrawableShape, DrawableShapeJson, ExportDataType, ShapeEntity } from '@common/types/Shapes'
import { omit } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'
import { getBase64Image } from './file'
import { refreshShape } from './shapes'
import { UtilsSettings } from '@canvas/constants/app'

export const cleanShapesBeforeExport = (shapes: DrawableShape[]): DrawableShapeJson[] => {
	const propsToOmit = ['img', 'id', 'selection', 'path', 'arrows']
	return shapes.map(shape => {
		if (shape.type === 'picture') {
			if (!shape.src.startsWith('http')) {
				return omit(propsToOmit, { ...shape, src: getBase64Image(shape.img) })
			}
		}
		return omit(propsToOmit, shape)
	})
}

export const buildDataToExport = (shapes: DrawableShape[], width: number, height: number) => {
	return {
		shapes: cleanShapesBeforeExport(shapes),
		config: {
			width,
			height
		}
	} as ExportDataType
}

export const addDefaultAndTempShapeProps = (shape: DrawableShape, settings: UtilsSettings) => {
	return refreshShape({ ...shape, id: uniqueId(`${shape.type}_`) } as ShapeEntity, settings)
}
