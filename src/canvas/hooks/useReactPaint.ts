import useShapes from '@canvas/hooks/useShapes'
import { buildDataToExport } from '@canvas/utils/data'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import { DEFAULT_OPTIONS, OptionalAppOptionsType, UtilsSettings } from '@canvas/constants/app'
import useComponent from '@canvas/hooks/useComponent'
import { DrawableShapeJson, ExportDataType, Point, ShapeEntity } from '@common/types/Shapes'
import { ToolsType } from '@common/types/tools'
import { SELECTION_TOOL } from '@editor/constants/tools'
import { sanitizeTools } from '@canvas/utils/tools'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseReactPaintProps = {
	width?: number
	height?: number
	shapes?: DrawableShapeJson[]
	onDataChanged?: () => void
	mode?: 'editor' | 'viewer'
	disabled?: boolean
	options?: OptionalAppOptionsType
}

const useReactPaint = ({
	width = 1000,
	height = 600,
	shapes: shapesFromProps,
	mode = 'editor',
	disabled = false,
	onDataChanged,
	options = DEFAULT_OPTIONS
}: UseReactPaintProps) => {
	const {
		layersManipulation,
		brushAlgo,
		grid,
		canGrow,
		canShrink,
		withExport,
		withLoadAndSave,
		withUploadPicture,
		withUrlPicture,
		withSkeleton,
		withFrameSelection,
		clearCallback,
		availableTools: availableToolsFromProps
	} = {
		...DEFAULT_OPTIONS,
		...options
	}

	const { canvasSelectionColor, canvasSelectionWidth, canvasSelectionPadding } = {
		...DEFAULT_OPTIONS.selection,
		...options?.selection
	}

	const isEditMode = mode !== 'viewer'
	const isDisabled = disabled || !isEditMode

	const editorRef = useRef<HTMLElement | null>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)

	const setEditor = useCallback((node: HTMLElement | null) => {
		editorRef.current = node
	}, [])

	const [activeTool, setActiveTool] = useState<ToolsType>(SELECTION_TOOL)
	const [gridGap, setGridGap] = useState<number>(grid)

	const [canvasSize, setCanvasSize] = useState({
		width,
		height,
		scaleRatio: 1
	})

	const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
	const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(undefined)

	const settings: UtilsSettings = useMemo(
		() => ({
			brushAlgo,
			canvasSize,
			canvasOffset,
			gridGap,
			selectionPadding: canvasSelectionPadding
		}),
		[canvasSelectionPadding, gridGap, brushAlgo, canvasOffset, canvasSize]
	)

	const [availableTools, setAvailableTools] = useState(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))

	const { isInsideComponent } = useComponent({
		disabled: isDisabled,
		componentRef: editorRef
	})

	const {
		shapesRef,
		selectedShape,
		selectionFrame,
		hoveredShape,
		addShape,
		addPictureShape,
		moveShapes,
		setSelectedShape,
		setSelectionFrame,
		refreshSelectedShapes,
		refreshHoveredShape,
		removeShape,
		updateShape,
		backwardShape,
		forwardShape,
		clearShapes,
		saveShapes,
		toggleShapeVisibility,
		toggleShapeLock,
		canGoBackward,
		canGoForward,
		canClear
	} = useShapes(onDataChanged, settings)

	const selectTool = useCallback(
		(tool: ToolsType) => {
			setSelectedShape(undefined)
			setActiveTool(tool)
		},
		[setSelectedShape]
	)

	const resetCanvas = useCallback(
		(shapesToInit: ShapeEntity[] = [], clearHistory = false) => {
			clearShapes(shapesToInit, clearHistory)
			selectTool(SELECTION_TOOL)
			setCanvasOffset([0, 0])
		},
		[selectTool, clearShapes]
	)

	const selectShape = useCallback(
		(shape: ShapeEntity) => {
			setActiveTool(SELECTION_TOOL)
			setSelectedShape(shape)
		},
		[setSelectedShape]
	)

	const exportData = useCallback(() => {
		const content = encodeShapesInString(shapesRef.current, width, height)
		if (!content) {
			throw new Error("L'encodage a échoué")
		}
		downloadFile(content, 'drawing.json')
	}, [shapesRef, width, height])

	const exportPicture = useCallback(() => {
		const dataURL = getCanvasImage(shapesRef.current, width, height, settings)
		if (!dataURL) {
			throw new Error()
		}
		downloadFile(dataURL, 'drawing.png')
	}, [shapesRef, width, height, settings])

	const getCurrentImage = () => {
		return canvasRef.current ? getCanvasImage(shapesRef.current, width, height, settings) : undefined
	}

	const getCurrentData = () => {
		return buildDataToExport(shapesRef.current, width, height)
	}

	useEffect(() => {
		if (!isInsideComponent) setSelectedShape(undefined)
	}, [isInsideComponent, setSelectedShape])

	const loadImportedData = useCallback(
		async (json: ExportDataType, clearHistory = true) => {
			const shapes = await decodeImportedData(json, settings)
			resetCanvas(shapes, clearHistory)
		},
		[resetCanvas, settings]
	)

	const loadFile = useCallback(
		async (file: File) => {
			const json = await decodeJson(file)
			await loadImportedData(json as ExportDataType)
		},
		[loadImportedData]
	)

	const clearCanvas = useCallback(() => {
		if (typeof clearCallback !== 'string') {
			void loadImportedData({ shapes: clearCallback() } as ExportDataType, false)
		} else {
			if (clearCallback === 'defaultShapes' && shapesFromProps !== undefined) {
				void loadImportedData({ shapes: shapesFromProps } as ExportDataType, false)
			} else {
				resetCanvas()
			}
		}
	}, [resetCanvas, loadImportedData, shapesFromProps, clearCallback])

	//TODO: temporary hack. Need to be fixed when rewriting api
	const loadImportedDataRef = useRef(loadImportedData)
	loadImportedDataRef.current = loadImportedData

	useEffect(() => {
		if (shapesFromProps !== undefined) {
			void loadImportedDataRef.current({ shapes: shapesFromProps } as ExportDataType)
		}
	}, [shapesFromProps])

	useEffect(() => {
		setAvailableTools(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))
	}, [availableToolsFromProps, withUploadPicture, withUrlPicture])

	return {
		shapesRef,
		addPictureShape,
		moveShapes,
		toggleShapeVisibility,
		toggleShapeLock,
		canGoBackward,
		canGoForward,
		canClear,
		selectedShape,
		selectionFrame,
		hoveredShape,
		addShape,
		setSelectedShape,
		setSelectionFrame,
		refreshSelectedShapes,
		refreshHoveredShape,
		removeShape,
		updateShape,
		backwardShape,
		forwardShape,
		clearShapes,
		saveShapes,
		loadFile,
		exportData,
		exportPicture,
		clearCanvas,
		refs: {
			canvas: canvasRef,
			editor: editorRef,
			setEditor
		},
		width,
		height,
		canvasOffset,
		canvasSize,
		setCanvasSize,
		setCanvasOffset,
		selectTool,
		resetCanvas,
		selectShape,
		activeTool,
		setActiveTool,
		isInsideComponent,
		isEditMode,
		isDisabled,
		availableTools,
		setAvailableTools,
		settings,
		api: { getCurrentImage, getCurrentData },
		gridGap,
		setGridGap,
		canvas: {
			selection: {
				canvasSelectionColor,
				canvasSelectionWidth,
				canvasSelectionPadding
			},
			withSkeleton,
			withFrameSelection,
			canGrow,
			canShrink,
			layersManipulation,
			withExport,
			withLoadAndSave,
			withUploadPicture,
			withUrlPicture,
			clearCallback
		}
	}
}

export type UseReactPaintReturnType = ReturnType<typeof useReactPaint>

export default useReactPaint