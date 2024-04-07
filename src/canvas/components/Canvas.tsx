import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { DRAWCANVAS_CLASSNAME, type UtilsSettings, SELECTIONCANVAS_CLASSNAME } from '@canvas/constants/app'
import useDrawableCanvas from '@canvas/hooks/useDrawableCanvas'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { initCanvasContext } from '@canvas/utils/canvas'
import { drawGrid } from '@canvas/utils/grid'
import { drawSelectionFrame, drawShape, drawShapeSelection, refreshShape } from '@canvas/utils/shapes'
import { resizeTextShapeWithNewContent } from '@canvas/utils/shapes/text'
import './Canvas.css'
import EditTextBox from './EditTextBox'

const renderDrawCanvas = (
	drawCtx: CanvasRenderingContext2D,
	selectionMode: SelectionModeData<number | Point>,
	settings: UtilsSettings,
	shapes: ShapeEntity[],
	selectedShape: ShapeEntity | undefined
) => {
	const {
		canvasSize: { width, height }
	} = settings
	drawCtx.clearRect(0, 0, width, height)
	initCanvasContext(drawCtx)
	settings.gridGap && drawGrid(drawCtx, width, height, settings)
	for (let i = shapes.length - 1; i >= 0; i--) {
		if (selectionMode.mode !== 'textedition' || shapes[i] !== selectedShape) {
			drawShape(drawCtx, shapes[i], settings)
		}
	}
}

const renderSelectionCanvas = (
	selectionCtx: CanvasRenderingContext2D,
	selectionMode: SelectionModeData<number | Point>,
	settings: UtilsSettings,
	activeTool: ToolsType,
	selectionWidth: number,
	selectionColor: string,
	selectedShape: ShapeEntity | undefined,
	hoveredShape: ShapeEntity | undefined,
	selectionFrame: [Point, Point] | undefined,
	withSkeleton: boolean
) => {
	selectionCtx.clearRect(0, 0, settings.canvasSize.width, settings.canvasSize.height)

	withSkeleton &&
		hoveredShape &&
		hoveredShape.id !== selectedShape?.id &&
		activeTool.type === 'selection' &&
		selectionMode.mode === 'default' &&
		drawShapeSelection({
			ctx: selectionCtx,
			shape: hoveredShape,
			settings,
			selectionWidth,
			selectionColor,
			withAnchors: false
		})

	selectedShape &&
		activeTool.type !== 'brush' &&
		drawShapeSelection({
			ctx: selectionCtx,
			shape: selectedShape,
			settings,
			selectionWidth,
			selectionColor,
			withAnchors: selectionMode.mode !== 'textedition'
		})

	selectionFrame &&
		drawSelectionFrame({
			ctx: selectionCtx,
			selectionFrame,
			settings
		})
}

type DrawerType = {
	disabled?: boolean
	canGrow?: boolean
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	}
	selectionColor: string
	selectionWidth: number
	settings: UtilsSettings
	isEditMode: boolean
	shapes: ShapeEntity[]
	saveShapes: () => void
	addShape: (newShape: ShapeEntity) => void
	updateSingleShape: (updatedShape: ShapeEntity) => void
	selectedShape: ShapeEntity | undefined
	setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>
	setSelectionFrame: React.Dispatch<React.SetStateAction<[Point, Point] | undefined>>
	hoveredShape: ShapeEntity | undefined
	selectionFrame: [Point, Point] | undefined
	refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void
	refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void
	activeTool: ToolsType
	setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
	canvasOffsetStartPosition: Point | undefined
	setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
	setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
	isInsideComponent: boolean
	selectionMode: SelectionModeData<number | Point>
	setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
	isShiftPressed: boolean
	withFrameSelection: boolean
	withSkeleton: boolean
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
	(
		{
			canGrow,
			disabled = false,
			canvasSize,
			shapes,
			addShape,
			updateSingleShape,
			selectedShape,
			setSelectedShape,
			setSelectionFrame,
			hoveredShape,
			selectionFrame,
			refreshHoveredShape,
			refreshSelectedShapes,
			saveShapes,
			activeTool,
			setActiveTool,
			canvasOffsetStartPosition,
			setCanvasOffsetStartPosition,
			setCanvasOffset,
			isInsideComponent,
			selectionMode,
			setSelectionMode,
			selectionWidth,
			selectionColor,
			settings,
			isEditMode,
			isShiftPressed,
			withFrameSelection,
			withSkeleton
		},
		ref
	) => {
		const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
		const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)

		useImperativeHandle(ref, () => drawCanvasRef.current!)

		const { hoverMode } = useDrawableCanvas({
			disabled,
			addShape,
			drawCanvasRef,
			setActiveTool,
			shapes,
			selectionMode,
			activeTool,
			isInsideComponent,
			setCanvasOffset,
			selectedShape,
			selectionCanvasRef,
			canvasOffsetStartPosition,
			setSelectedShape,
			setSelectionFrame,
			refreshHoveredShape,
			refreshSelectedShapes,
			setCanvasOffsetStartPosition,
			updateSingleShape,
			saveShapes,
			setSelectionMode,
			isShiftPressed,
			withFrameSelection,
			settings
		})
		const updateSelectedShapeText = useCallback(
			(newText: string[]) => {
				if (selectedShape?.type !== 'text') return

				const ctx = drawCanvasRef.current?.getContext('2d')
				if (!ctx) return

				const newShape = refreshShape(resizeTextShapeWithNewContent(ctx, selectedShape, newText, settings), settings)

				updateSingleShape(newShape)
			},
			[updateSingleShape, selectedShape, settings]
		)

		useEffect(() => {
			const drawCtx = drawCanvasRef.current?.getContext('2d')
			drawCtx && window.requestAnimationFrame(() => renderDrawCanvas(drawCtx, selectionMode, settings, shapes, selectedShape))
		}, [shapes, selectionMode, selectedShape, settings])

		useEffect(() => {
			const selectionCtx = selectionCanvasRef.current?.getContext('2d')

			selectionCtx &&
				window.requestAnimationFrame(() =>
					renderSelectionCanvas(
						selectionCtx,
						selectionMode,
						settings,
						activeTool,
						selectionWidth,
						selectionColor,
						selectedShape,
						hoveredShape,
						selectionFrame,
						withSkeleton
					)
				)
		}, [hoveredShape, selectionFrame, selectionMode, selectedShape, activeTool, settings, selectionWidth, selectionColor, withSkeleton])

		return (
			<div className='react-paint-editor-canvas-box'>
				<div className='react-paint-editor-canvas-container' data-grow={canGrow}>
					<canvas className={DRAWCANVAS_CLASSNAME} ref={drawCanvasRef} data-grow={canGrow} width={canvasSize.width} height={canvasSize.height} />
					{isEditMode && (
						<canvas
							className={SELECTIONCANVAS_CLASSNAME}
							ref={selectionCanvasRef}
							width={canvasSize.width}
							height={canvasSize.height}
							data-grow={canGrow}
							style={{
								'--react-paint-editor-canvas-cursor':
									(activeTool.type !== 'selection' && activeTool.type !== 'move') || hoverMode.mode === 'resize'
										? 'crosshair'
										: activeTool.type === 'move' || hoverMode.mode === 'translate'
										  ? 'move'
										  : hoverMode.mode === 'rotate'
											  ? 'grab'
											  : 'default'
							}}
						/>
					)}
					{isEditMode && selectionMode.mode === 'textedition' && selectedShape?.type === 'text' && (
						<EditTextBox
							scaleRatio={canvasSize.scaleRatio}
							disabled={disabled}
							shape={selectedShape}
							defaultValue={selectionMode.defaultValue}
							updateValue={updateSelectedShapeText}
							saveShapes={saveShapes}
							settings={settings}
						/>
					)}
				</div>
			</div>
		)
	}
)

export default Canvas
