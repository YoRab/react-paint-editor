import React, { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import Loading from '@editor/components/common/Loading'
import { DEFAULT_OPTIONS, GridFormatType, OptionalAppOptionsType, UtilsSettings } from '@common/constants/app'
import { STYLE_ZINDEX } from '@editor/constants/style'
import { SELECTION_TOOL } from '@editor/constants/tools'
import useComponent from '@common/hooks/useComponent'
import useKeyboard from '@canvas/hooks/useKeyboard'
import useResizeObserver from '@common/hooks/useResizeObserver'
import useShapes from '@canvas/hooks/useShapes'
import useSnackbar from '@editor/hooks/useSnackbar'
import type { SelectionModeData } from '@common/types/Mode'
import type { DrawableShapeJson, ExportDataType, Point, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { buildDataToExport } from '@canvas/utils/data'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString as encodeProjectDataInString, getCanvasImage } from '@canvas/utils/file'
import { set } from '@common/utils/object'
import { sanitizeTools } from '@editor/utils/toolbar'
import './App.css'
import Canvas from '@canvas/components/Canvas'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import SettingsBar from '@editor/components/settings/SettingsBar'
import Toolbar from '@editor/components/toolbox/Toolbar'

type AppType = {
	className?: string
	width?: number
	height?: number
	shapes?: DrawableShapeJson[]
	onDataChanged?: () => void
	mode?: 'editor' | 'viewer'
	disabled?: boolean
	apiRef?: MutableRefObject<
		| undefined
		| {
				getCurrentImage: () => string | undefined
				getCurrentData: () => ExportDataType
		  }
	>
	options?: OptionalAppOptionsType
}

const App = ({
	width = 1000,
	height = 600,
	shapes: shapesFromProps,
	className = '',
	mode = 'editor',
	disabled = false,
	onDataChanged,
	apiRef,
	options = DEFAULT_OPTIONS
}: AppType) => {
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

	const {
		toolbarBackgroundColor,
		dividerColor,
		fontRadius,
		fontDisabledColor,
		fontDisabledBackgroundColor,
		fontColor,
		fontBackgroundColor,
		fontSelectedColor,
		fontSelectedBackgroundColor,
		fontHoverColor,
		fontHoverBackgroundColor,
		canvasBackgroundColor,
		canvasSelectionColor,
		canvasSelectionWidth,
		canvasSelectionPadding
	} = {
		...DEFAULT_OPTIONS.uiStyle,
		...(options?.uiStyle ?? {})
	}
	const isEditMode = mode !== 'viewer'
	const isDisabled = disabled || !isEditMode
	const componentRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [canvasSize, setCanvasSize] = useState({
		width,
		height,
		scaleRatio: 1
	})

	const [gridFormat, setGridFormat] = useState<GridFormatType>(grid)
	const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
	const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(undefined)

	const settings: UtilsSettings = useMemo(
		() => ({
			brushAlgo,
			canvasSize,
			canvasOffset,
			gridFormat,
			selectionPadding: canvasSelectionPadding
		}),
		[canvasSelectionPadding, gridFormat, brushAlgo, canvasOffset, canvasSize]
	)

	const [availableTools, setAvailableTools] = useState(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))

	const { isInsideComponent } = useComponent({
		disabled: isDisabled,
		componentRef
	})

	const [isLoading, setIsLoading] = useState(false)

	const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)
	const [activeTool, setActiveTool] = useState<ToolsType>(SELECTION_TOOL)

	const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
		mode: 'default'
	})

	const [isShiftPressed, setShiftPressed] = useState<boolean>(false)

	if (apiRef) {
		apiRef.current = {
			getCurrentImage: () => {
				return canvasRef.current ? getCanvasImage(shapesRef.current, width, height, settings) : undefined
			},

			getCurrentData: () => {
				return buildDataToExport(shapesRef.current, width, height)
			}
		}
	}

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

	const { snackbarList, addSnackbar } = useSnackbar()

	const selectTool = useCallback(
		(tool: ToolsType) => {
			setSelectedShape(undefined)
			setActiveTool(tool)
		},
		[setSelectedShape]
	)

	const updateToolSettings = useCallback((toolId: string, field: string, value: string | number | boolean) => {
		setAvailableTools(availableTools => availableTools.map(tool => (tool.id === toolId ? set(['settings', field, 'default'], value, tool) : tool)))
		setActiveTool(activeTool => (activeTool.id === toolId ? set(['settings', field, 'default'], value, activeTool) : activeTool))
	}, [])

	const undoAction = useCallback(() => {
		selectTool(SELECTION_TOOL)
		backwardShape()
	}, [selectTool, backwardShape])

	const redoAction = useCallback(() => {
		selectTool(SELECTION_TOOL)
		forwardShape()
	}, [selectTool, forwardShape])

	const resetCanvas = useCallback(
		(shapesToInit: ShapeEntity[] = [], clearHistory = false) => {
			clearShapes(shapesToInit, clearHistory)
			selectTool(SELECTION_TOOL)
			setCanvasOffset([0, 0])
		},
		[selectTool, clearShapes]
	)

	const loadImportedData = useCallback(
		async (json: ExportDataType, clearHistory = true) => {
			const shapes = await decodeImportedData(json, settings)
			resetCanvas(shapes, clearHistory)
		},
		[resetCanvas, settings]
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

	const selectShape = useCallback(
		(shape: ShapeEntity) => {
			setActiveTool(SELECTION_TOOL)
			setSelectedShape(shape)
		},
		[setSelectedShape]
	)

	const pasteShape = useCallback(
		(shape: ShapeEntity) => {
			addShape(shape)
			selectShape(shape)
		},
		[addShape, selectShape]
	)

	const exportCanvasInFile = useCallback(() => {
		setIsLoading(true)
		try {
			const dataURL = canvasRef.current && getCanvasImage(shapesRef.current, width, height, settings)
			if (!dataURL) {
				throw new Error()
			}
			downloadFile(dataURL, 'drawing.png')
			setIsLoading(false)
		} catch (e) {
			if (e instanceof Error) {
				addSnackbar({ type: 'error', text: "L'export a échoué" })
			}
			console.warn(e)
		} finally {
			setIsLoading(false)
		}
	}, [addSnackbar, shapesRef, width, height, settings])

	const saveFile = useCallback(() => {
		setIsLoading(true)
		try {
			const content = encodeProjectDataInString(shapesRef.current, width, height)
			if (!content) {
				throw new Error("L'encodage a échoué")
			}
			downloadFile(content, 'drawing.json')
			setIsLoading(false)
		} catch (e) {
			if (e instanceof Error) {
				addSnackbar({ type: 'error', text: "L'enregistrement a échoué" })
			}
			console.warn(e)
		} finally {
			setIsLoading(false)
		}
	}, [shapesRef, addSnackbar, width, height])

	const loadFile = useCallback(
		async (file: File) => {
			setIsLoading(true)
			try {
				const json = await decodeJson(file)
				await loadImportedData(json as ExportDataType)
				addSnackbar({ type: 'success', text: 'Fichier chargé !' })
			} catch (e) {
				if (e instanceof Error) {
					addSnackbar({ type: 'error', text: 'Le chargement a échoué' })
				}
				console.warn(e)
			} finally {
				setIsLoading(false)
			}
		},
		[loadImportedData, addSnackbar]
	)

	const addPicture = useCallback(
		async (fileOrUrl: File | string) => {
			setIsLoading(true)
			try {
				const pictureShape = await addPictureShape(fileOrUrl, width, height)
				selectShape(pictureShape)
			} catch (e) {
				if (e instanceof Error) {
					addSnackbar({ type: 'error', text: 'Le chargement a échoué' })
				}
				console.warn(e)
			} finally {
				setIsLoading(false)
			}
		},
		[addPictureShape, selectShape, addSnackbar, width, height]
	)

	const onResized = useCallback(
		(measuredWidth: number) => {
			const scaleRatio = measuredWidth / width
			setCanvasSize({ width: measuredWidth, height: height * scaleRatio, scaleRatio })
		},
		[width, height]
	)

	useKeyboard({
		isInsideComponent,
		isEditingText: selectionMode.mode === 'textedition',
		settings,
		selectedShape,
		setSelectedShape,
		removeShape,
		pasteShape,
		updateShape,
		backwardShape,
		forwardShape,
		setShiftPressed
	})

	useResizeObserver({ element: componentRef, onResized })

	useEffect(() => {
		setAvailableTools(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))
	}, [availableToolsFromProps, withUploadPicture, withUrlPicture])

	useEffect(() => {
		if (!isInsideComponent) setSelectedShape(undefined)
	}, [isInsideComponent, setSelectedShape])

	//TODO: temporary hack. Need to be fixed when rewriting api
	const loadImportedDataRef = useRef(loadImportedData)
	loadImportedDataRef.current = loadImportedData

	useEffect(() => {
		if (shapesFromProps !== undefined) {
			void loadImportedDataRef.current({ shapes: shapesFromProps } as ExportDataType)
		}
	}, [shapesFromProps])

	const appClassName = `${className}${isLayoutPanelShown ? ' react-paint-editor-layout-opened' : ''} react-paint-editor-app`

	return (
		<div
			ref={componentRef}
			className={appClassName}
			data-grow={canGrow}
			data-shrink={canShrink}
			style={{
				'--react-paint-editor-app-canvaswidth': `${width}px`,
				'--react-paint-editor-app-toolbar-bg': toolbarBackgroundColor,
				'--react-paint-editor-app-divider-color': dividerColor,
				'--react-paint-editor-app-font-radius': fontRadius,
				'--react-paint-editor-app-font-disabled-color': fontDisabledColor,
				'--react-paint-editor-app-font-disabled-bg': fontDisabledBackgroundColor,
				'--react-paint-editor-app-font-color': fontColor,
				'--react-paint-editor-app-font-bg': fontBackgroundColor,
				'--react-paint-editor-app-font-selected-color': fontSelectedColor,
				'--react-paint-editor-app-font-selected-bg': fontSelectedBackgroundColor,
				'--react-paint-editor-app-font-hover-color': fontHoverColor,
				'--react-paint-editor-app-font-hover-bg': fontHoverBackgroundColor,
				'--react-paint-editor-app-canvas-bg': canvasBackgroundColor
			}}
		>
			{isEditMode && (
				<Toolbar
					width={canvasSize.width}
					disabled={isDisabled}
					activeTool={activeTool}
					clearCanvas={clearCanvas}
					setActiveTool={selectTool}
					exportCanvasInFile={exportCanvasInFile}
					saveFile={saveFile}
					loadFile={loadFile}
					addPicture={addPicture}
					hasActionToUndo={canGoBackward}
					hasActionToRedo={canGoForward}
					hasActionToClear={canClear}
					undoAction={undoAction}
					redoAction={redoAction}
					availableTools={availableTools}
					withExport={withExport}
					withLoadAndSave={withLoadAndSave}
					withUploadPicture={withUploadPicture}
					withUrlPicture={withUrlPicture}
				/>
			)}
			<div
				className='react-paint-editor-app-row'
				data-grow={canGrow}
				style={{
					'--react-paint-editor-app-row-zindex': STYLE_ZINDEX.APP,
					'--react-paint-editor-app-row-width': canvasSize.width,
					'--react-paint-editor-app-row-aspectratio': `calc(${canvasSize.width} / ${canvasSize.height})`
				}}
			>
				<Canvas
					canGrow={canGrow}
					disabled={isDisabled}
					isInsideComponent={isInsideComponent}
					activeTool={activeTool}
					setActiveTool={setActiveTool}
					canvasOffsetStartPosition={canvasOffsetStartPosition}
					setCanvasOffsetStartPosition={setCanvasOffsetStartPosition}
					shapes={shapesRef.current}
					addShape={addShape}
					updateSingleShape={updateShape}
					selectedShape={selectedShape}
					selectionFrame={selectionFrame}
					setSelectedShape={setSelectedShape}
					setSelectionFrame={setSelectionFrame}
					hoveredShape={hoveredShape}
					refreshHoveredShape={refreshHoveredShape}
					refreshSelectedShapes={refreshSelectedShapes}
					settings={settings}
					setCanvasOffset={setCanvasOffset}
					saveShapes={saveShapes}
					ref={canvasRef}
					canvasSize={canvasSize}
					selectionMode={selectionMode}
					setSelectionMode={setSelectionMode}
					selectionColor={canvasSelectionColor}
					selectionWidth={canvasSelectionWidth}
					isEditMode={isEditMode}
					isShiftPressed={isShiftPressed}
					withFrameSelection={withFrameSelection}
					withSkeleton={withSkeleton}
				/>
				{isEditMode && layersManipulation && (
					<Layouts
						gridFormat={gridFormat}
						setGridFormat={setGridFormat}
						disabled={isDisabled}
						shapes={shapesRef.current}
						moveShapes={moveShapes}
						selectedShape={selectedShape}
						removeShape={removeShape}
						selectShape={selectShape}
						toggleShapeVisibility={toggleShapeVisibility}
						toggleShapeLock={toggleShapeLock}
						isLayoutPanelShown={isLayoutPanelShown}
					/>
				)}
			</div>
			{isEditMode && (
				<>
					<SettingsBar
						width={canvasSize.width}
						disabled={isDisabled}
						activeTool={activeTool}
						availableTools={availableTools}
						selectedShape={selectedShape}
						settings={settings}
						removeShape={removeShape}
						updateShape={updateShape}
						canvas={canvasRef.current}
						layersManipulation={layersManipulation}
						toggleLayoutPanel={() => {
							setIsLayoutPanelShown(prev => !prev)
						}}
						updateToolSettings={updateToolSettings}
					/>
					<Loading isLoading={isLoading} />
					<SnackbarContainer snackbarList={snackbarList} />
				</>
			)}
		</div>
	)
}

export default App
