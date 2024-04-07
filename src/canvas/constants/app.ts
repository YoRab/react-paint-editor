import type { DrawableShapeJson, Point } from '@common/types/Shapes'
import type { CustomToolInput } from '@common/types/tools'
import type { RecursivePartial } from '@common/types/utils'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_PADDING, SELECTION_DEFAULT_WIDTH } from './shapes'
import { DEFAULT_SHAPE_TOOLS } from '@editor/constants/tools'

export const APP_NAME = 'react_paint'

export const DRAWCANVAS_CLASSNAME = 'react-paint-editor-canvas-drawcanvas'
export const SELECTIONCANVAS_CLASSNAME = 'react-paint-editor-canvas-selectioncanvas'

export type BrushAlgo = 'simple' | 'quadratic'

export type UtilsSettings = {
	brushAlgo: BrushAlgo
	gridGap: number
	canvasOffset: Point
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	}
	selectionPadding: number
}
type AppOptionsType = {
	layersManipulation: boolean
	grid: number
	canGrow: boolean
	canShrink: boolean
	availableTools: CustomToolInput[]
	withExport: boolean
	withLoadAndSave: boolean
	withUploadPicture: boolean
	withUrlPicture: boolean
	withFrameSelection: boolean
	withSkeleton: boolean
	clearCallback: 'empty' | 'defaultShapes' | (() => DrawableShapeJson[])
	brushAlgo: BrushAlgo
	uiStyle: {
		toolbarBackgroundColor: string
		dividerColor: string
		fontRadius: number
		fontDisabledColor: string
		fontDisabledBackgroundColor: string
		fontColor: string
		fontBackgroundColor: string
		fontSelectedColor: string
		fontSelectedBackgroundColor: string
		fontHoverColor: string
		fontHoverBackgroundColor: string
		canvasBackgroundColor: string
		canvasSelectionColor: string
		canvasSelectionWidth: number
		canvasSelectionPadding: number
	}
}

export type OptionalAppOptionsType = RecursivePartial<AppOptionsType>

export const DEFAULT_OPTIONS: AppOptionsType = {
	layersManipulation: true,
	grid: 0,
	canGrow: false,
	canShrink: true,
	withExport: true,
	withLoadAndSave: true,
	withUploadPicture: true,
	withUrlPicture: false,
	availableTools: DEFAULT_SHAPE_TOOLS,
	clearCallback: 'empty',
	brushAlgo: 'simple',
	withFrameSelection: false,
	withSkeleton: false,
	uiStyle: {
		toolbarBackgroundColor: 'white',
		dividerColor: '#36418129',
		fontRadius: 8,
		fontDisabledColor: '#3641812b',
		fontDisabledBackgroundColor: 'transparent',
		fontColor: '#364181',
		fontBackgroundColor: 'transparent',
		fontSelectedColor: 'white',
		fontSelectedBackgroundColor: '#364181',
		fontHoverColor: '#364181',
		fontHoverBackgroundColor: '#afd8d8',
		canvasBackgroundColor: 'white',
		canvasSelectionColor: SELECTION_DEFAULT_COLOR,
		canvasSelectionWidth: SELECTION_DEFAULT_WIDTH,
		canvasSelectionPadding: SELECTION_DEFAULT_PADDING
	}
}
