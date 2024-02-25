import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { DRAWCANVAS_CLASSNAME, type GridFormatType, SELECTIONCANVAS_CLASSNAME } from '../constants/app'
import useDrawableCanvas from '../hooks/useDrawableCanvas'
import type { SelectionModeData } from '../types/Mode'
import type { Point, ShapeEntity } from '../types/Shapes'
import type { ToolsType } from '../types/tools'
import { initCanvasContext } from '../utils/canvas'
import { drawGrid } from '../utils/grid'
import { drawSelectionFrame, drawShape, drawShapeSelection, refreshShape } from '../utils/shapes'
import { resizeTextShapeWithNewContent } from '../utils/shapes/text'
import './Canvas.css'
import EditTextBox from './toolbox/EditTextBox'

const renderDrawCanvas = (
	drawCtx: CanvasRenderingContext2D,
	selectionMode: SelectionModeData<number | Point>,
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	},
	gridFormat: GridFormatType,
	canvasOffset: Point,
	shapes: ShapeEntity[],
	selectionPadding: number,
	selectedShape: ShapeEntity | undefined
) => {
	const { width, height, scaleRatio } = canvasSize
	drawCtx.clearRect(0, 0, width, height)
	initCanvasContext(drawCtx)
	gridFormat && drawGrid(drawCtx, width, height, scaleRatio, canvasOffset, gridFormat)
	for (let i = shapes.length - 1; i >= 0; i--) {
		if (selectionMode.mode !== 'textedition' || shapes[i] !== selectedShape) {
			drawShape(drawCtx, shapes[i], scaleRatio, canvasOffset, selectionPadding)
		}
	}
}

const renderSelectionCanvas = (
	selectionCtx: CanvasRenderingContext2D,
	selectionMode: SelectionModeData<number | Point>,
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	},
	activeTool: ToolsType,
	canvasOffset: Point,
	selectionPadding: number,
	selectionWidth: number,
	selectionColor: string,
	selectedShape: ShapeEntity | undefined,
	hoveredShape: ShapeEntity | undefined,
	selectionFrame: [Point, Point] | undefined
) => {
	const { width, height, scaleRatio } = canvasSize
	selectionCtx.clearRect(0, 0, width, height)

	hoveredShape &&
		hoveredShape.id !== selectedShape?.id &&
		activeTool.type === 'selection' &&
		selectionMode.mode === 'default' &&
		drawShapeSelection({
			ctx: selectionCtx,
			shape: hoveredShape,
			currentScale: scaleRatio,
			canvasOffset,
			selectionPadding,
			selectionWidth,
			selectionColor,
			withAnchors: false
		})

	selectedShape &&
		activeTool.type !== 'brush' &&
		drawShapeSelection({
			ctx: selectionCtx,
			shape: selectedShape,
			currentScale: scaleRatio,
			canvasOffset,
			selectionPadding,
			selectionWidth,
			selectionColor,
			withAnchors: selectionMode.mode !== 'textedition'
		})

	selectionFrame &&
		drawSelectionFrame({
			ctx: selectionCtx,
			selectionFrame,
			currentScale: scaleRatio,
			canvasOffset
		})
}

type DrawerType = {
	gridFormat: GridFormatType
	disabled?: boolean
	canGrow?: boolean
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	}
	selectionColor: string
	selectionWidth: number
	selectionPadding: number
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
	refreshHoveredShape: (
		e: MouseEvent | TouchEvent,
		ctx: CanvasRenderingContext2D,
		cursorPosition: Point,
		canvasOffset: Point,
		currentScale: number
	) => void
	refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, canvasOffset: Point, currentScale: number) => void
	activeTool: ToolsType
	setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
	canvasOffsetStartPosition: Point | undefined
	setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
	canvasOffset: Point
	setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
	isInsideComponent: boolean
	selectionMode: SelectionModeData<number | Point>
	setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
	isShiftPressed: boolean
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
	(
		{
			gridFormat,
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
			canvasOffset,
			setCanvasOffset,
			isInsideComponent,
			selectionMode,
			setSelectionMode,
			selectionWidth,
			selectionColor,
			selectionPadding,
			isEditMode,
			isShiftPressed
		},
		ref
	) => {
		const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
		const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)

		useImperativeHandle(ref, () => drawCanvasRef.current!)

		const { hoverMode } = useDrawableCanvas({
			disabled,
			addShape,
			canvasSize,
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
			gridFormat,
			canvasOffset,
			saveShapes,
			setSelectionMode,
			selectionPadding,
			isShiftPressed
		})

		const { scaleRatio: currentScale } = canvasSize

		const updateSelectedShapeText = useCallback(
			(newText: string[]) => {
				if (selectedShape?.type !== 'text') return

				const ctx = drawCanvasRef.current?.getContext('2d')
				if (!ctx) return

				const newShape = refreshShape(
					resizeTextShapeWithNewContent(ctx, selectedShape, newText, selectionPadding, canvasOffset),
					currentScale,
					selectionPadding
				)

				updateSingleShape(newShape)
			},
			[updateSingleShape, selectedShape, canvasOffset, currentScale, selectionPadding]
		)

		useEffect(() => {
			const drawCtx = drawCanvasRef.current?.getContext('2d')

			drawCtx &&
				window.requestAnimationFrame(() =>
					renderDrawCanvas(drawCtx, selectionMode, canvasSize, gridFormat, canvasOffset, shapes, selectionPadding, selectedShape)
				)
		}, [shapes, gridFormat, selectionMode, selectedShape, canvasOffset, canvasSize, selectionPadding])

		useEffect(() => {
			const selectionCtx = selectionCanvasRef.current?.getContext('2d')

			selectionCtx &&
				window.requestAnimationFrame(() =>
					renderSelectionCanvas(
						selectionCtx,
						selectionMode,
						canvasSize,
						activeTool,
						canvasOffset,
						selectionPadding,
						selectionWidth,
						selectionColor,
						selectedShape,
						hoveredShape,
						selectionFrame
					)
				)
		}, [
			hoveredShape,
			selectionFrame,
			selectionMode,
			selectedShape,
			activeTool,
			canvasOffset,
			canvasSize,
			selectionPadding,
			selectionWidth,
			selectionColor
		])

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
							selectionPadding={selectionPadding}
						/>
					)}
				</div>
			</div>
		)
	}
)

export default Canvas
