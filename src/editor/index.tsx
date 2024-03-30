import React, { ReactNode, useCallback, useState } from 'react'
import Loading from '@editor/components/common/Loading'
import { SELECTION_TOOL } from '@editor/constants/tools'
import useSnackbar from '@editor/hooks/useSnackbar'
import type { ExportDataType } from '@common/types/Shapes'
import { decodeJson, downloadFile, encodeShapesInString as encodeProjectDataInString, getCanvasImage } from '@canvas/utils/file'
import { set } from '@common/utils/object'
import './index.css'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import SettingsBar from '@editor/components/settings/SettingsBar'
import Toolbar from '@editor/components/toolbox/Toolbar'
import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'

type EditorProps = {
	hookProps: UseReactPaintReturnType
	className?: string
	children: ReactNode
}

const Editor = ({ hookProps, className = '', children }: EditorProps) => {
	const {
		shapesRef,
		addPictureShape,
		moveShapes,
		toggleShapeVisibility,
		toggleShapeLock,
		canGoBackward,
		canGoForward,
		canClear,
		selectedShape,
		removeShape,
		updateShape,
		backwardShape,
		forwardShape,
		refs,
		width,
		height,
		canvasSize,
		selectTool,
		selectShape,
		activeTool,
		setActiveTool,
		setAvailableTools,
		isEditMode,
		isDisabled,
		availableTools,
		gridFormat,
		setGridFormat,
		loadImportedData,
		clearCanvas,
		settings,
		canvas: {
			style: {
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
				canvasBackgroundColor
			},
			canGrow,
			canShrink,
			layersManipulation,
			withExport,
			withLoadAndSave,
			withUploadPicture,
			withUrlPicture
		}
	} = hookProps

	const [isLoading, setIsLoading] = useState(false)
	const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)

	const { snackbarList, addSnackbar } = useSnackbar()

	const updateToolSettings = useCallback(
		(toolId: string, field: string, value: string | number | boolean) => {
			setAvailableTools(availableTools => availableTools.map(tool => (tool.id === toolId ? set(['settings', field, 'default'], value, tool) : tool)))
			setActiveTool(activeTool => (activeTool.id === toolId ? set(['settings', field, 'default'], value, activeTool) : activeTool))
		},
		[setActiveTool, setAvailableTools]
	)

	const undoAction = useCallback(() => {
		selectTool(SELECTION_TOOL)
		backwardShape()
	}, [selectTool, backwardShape])

	const redoAction = useCallback(() => {
		selectTool(SELECTION_TOOL)
		forwardShape()
	}, [selectTool, forwardShape])

	const exportCanvasInFile = useCallback(() => {
		setIsLoading(true)
		try {
			const dataURL = refs.canvas.current && getCanvasImage(shapesRef.current, width, height, settings)
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
	}, [refs.canvas.current, addSnackbar, shapesRef, width, height, settings])

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

	const appClassName = `${className}${isLayoutPanelShown ? ' react-paint-editor-layout-opened' : ''} react-paint-editor-app`

	return (
		<div
			ref={refs.setEditor}
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
			{children}
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
						canvas={refs.canvas.current}
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

export default Editor
