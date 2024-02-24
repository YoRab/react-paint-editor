import {
	DEFAULT_SHAPE_BRUSH,
	DEFAULT_SHAPE_CIRCLE,
	DEFAULT_SHAPE_CURVE,
	DEFAULT_SHAPE_ELLIPSE,
	DEFAULT_SHAPE_LINE,
	DEFAULT_SHAPE_PICTURE,
	DEFAULT_SHAPE_POLYGON,
	DEFAULT_SHAPE_RECT,
	DEFAULT_SHAPE_SQUARE,
	DEFAULT_SHAPE_TEXT
} from '../constants/tools'
import type { ShapeType } from '../types/Shapes'
import type { CustomTool, CustomToolInput } from '../types/tools'
import type { RecursivePartial } from '../types/utils'
import { compact } from '../utils/array'
import { mergeWith } from '../utils/object'

export const getCurrentStructure = (
	availableTools: CustomTool[],
	defaultStructure: (
		| ShapeType
		| {
				title: string
				toolsType: ShapeType[]
				vertical: boolean
		  }
	)[]
): (
	| CustomTool
	| {
			title: string
			toolsType: CustomTool[]
			vertical: boolean
	  }
)[] => {
	const structure = defaultStructure.flatMap(
		(
			group
		):
			| CustomTool
			| CustomTool[]
			| {
					toolsType: CustomTool[]
					title: string
					vertical: boolean
			  }
			| null => {
			if (typeof group !== 'object') {
				return availableTools.filter(tool => tool.type === group)
			}
			const toolsType = availableTools.filter(tool => group.toolsType.includes(tool.type))
			if (!toolsType) return null
			return { ...group, toolsType }
		}
	)
	return compact(structure)
}

export const sanitizeTools = (tools: RecursivePartial<CustomToolInput>[], withPicture = false): CustomTool[] => {
	const customizer = (objValue: unknown, srcValue: unknown) => {
		if (Array.isArray(objValue)) {
			return srcValue
		}
	}

	const customTools = tools.map((tool: RecursivePartial<CustomToolInput>) => {
		if (typeof tool !== 'object') return null
		switch (tool.type) {
			case 'brush':
				return mergeWith(customizer, DEFAULT_SHAPE_BRUSH, tool) as CustomTool
			case 'circle':
				return mergeWith(customizer, DEFAULT_SHAPE_CIRCLE, tool) as CustomTool
			case 'curve':
				return mergeWith(customizer, DEFAULT_SHAPE_CURVE, tool) as CustomTool
			case 'ellipse':
				return mergeWith(customizer, DEFAULT_SHAPE_ELLIPSE, tool) as CustomTool
			case 'line':
				return mergeWith(customizer, DEFAULT_SHAPE_LINE, tool) as CustomTool
			case 'polygon':
				return mergeWith(customizer, DEFAULT_SHAPE_POLYGON, tool) as CustomTool
			case 'rect':
				return mergeWith(customizer, DEFAULT_SHAPE_RECT, tool) as CustomTool
			case 'square':
				return mergeWith(customizer, DEFAULT_SHAPE_SQUARE, tool) as CustomTool
			case 'text':
				return mergeWith(customizer, DEFAULT_SHAPE_TEXT, tool) as CustomTool
		}
		return null
	})

	return compact(withPicture ? [...customTools, DEFAULT_SHAPE_PICTURE] : customTools)
}
