import React, { useEffect, useState } from 'react'
import type { GridFormatType } from '../constants/app'
import { ShapeTypeArray } from '../constants/shapes'
import { SELECTION_TOOL } from '../constants/tools'
import useDoubleClick from '../hooks/useDoubleClick'
import type { HoverModeData, SelectionModeData } from '../types/Mode'
import type { Point, ShapeEntity } from '../types/Shapes'
import type { CustomTool, ToolsType } from '../types/tools'
import { checkSelectionIntersection, getCursorPosition, isTouchGesture } from '../utils/intersect'
import { selectShape } from '../utils/selection'
import { createShape } from '../utils/shapes'
import { addNewPointGroupToShape } from '../utils/shapes/brush'
import { transformShape } from '../utils/transform'

const handleMove = (
	e: MouseEvent | TouchEvent,
	canvasRef: React.RefObject<HTMLCanvasElement>,
	activeTool: ToolsType,
	gridFormat: GridFormatType,
	canvasOffset: Point,
	selectedShape: ShapeEntity | undefined,
	selectionMode: SelectionModeData<Point | number>,
	canvasOffsetStartPosition: Point | undefined,
	width: number,
	height: number,
	scaleRatio: number,
	setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
	refreshHoveredShape: (
		e: MouseEvent | TouchEvent,
		ctx: CanvasRenderingContext2D,
		cursorPosition: Point,
		canvasOffset: Point,
		currentScale: number
	) => void,
	updateSingleShape: (updatedShape: ShapeEntity) => void,
	setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>,
	setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>,
	refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, canvasOffset: Point, currentScale: number) => void,
	selectionPadding: number,
	isShiftPressed: boolean
) => {
	const drawCtx = canvasRef.current?.getContext('2d')
	if (!drawCtx) return

	const cursorPosition = getCursorPosition(e, canvasRef.current, width, height, scaleRatio)

	if (activeTool.type === 'move' && canvasOffsetStartPosition !== undefined) {
		setCanvasOffset([cursorPosition[0] - canvasOffsetStartPosition[0], cursorPosition[1] - canvasOffsetStartPosition[1]])
		return
	}
	if (selectionMode.mode === 'selectionFrame') {
		refreshSelectedShapes(drawCtx, cursorPosition, canvasOffset, scaleRatio)
		return
	}

	if (!isTouchGesture(e)) {
		refreshHoveredShape(e, drawCtx, cursorPosition, canvasOffset, scaleRatio)
	}

	if (selectedShape === undefined || selectedShape.locked) return

	if (selectionMode.mode === 'default' || selectionMode.mode === 'textedition') {
		const positionIntersection = checkSelectionIntersection(selectedShape, cursorPosition, canvasOffset, selectionPadding, scaleRatio, true) || {
			mode: 'default'
		}
		setHoverMode(positionIntersection)
	} else {
		const ctx = canvasRef.current?.getContext('2d')
		if (!ctx) return
		const newShape = transformShape(
			ctx,
			selectedShape,
			cursorPosition,
			gridFormat,
			canvasOffset,
			selectionMode,
			selectionPadding,
			isShiftPressed,
			scaleRatio
		)
		updateSingleShape(newShape)
		setSelectedShape(newShape)
	}
}

type UseCanvasType = {
	disabled?: boolean
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	}
	shapes: ShapeEntity[]
	saveShapes: () => void
	addShape: (newShape: ShapeEntity) => void
	updateSingleShape: (updatedShape: ShapeEntity) => void
	selectedShape: ShapeEntity | undefined
	setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>
	activeTool: ToolsType
	setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
	refreshHoveredShape: (
		e: MouseEvent | TouchEvent,
		ctx: CanvasRenderingContext2D,
		cursorPosition: Point,
		canvasOffset: Point,
		currentScale: number
	) => void
	refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, canvasOffset: Point, currentScale: number) => void
	canvasOffsetStartPosition: Point | undefined
	setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
	gridFormat: GridFormatType
	canvasOffset: Point
	setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
	isInsideComponent: boolean
	selectionMode: SelectionModeData<number | Point>
	setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
	setSelectionFrame: React.Dispatch<React.SetStateAction<[Point, Point] | undefined>>
	drawCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
	selectionCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
	selectionPadding: number
	isShiftPressed: boolean
}

const useDrawableCanvas = ({
	disabled = false,
	addShape,
	canvasSize,
	drawCanvasRef,
	setActiveTool,
	refreshHoveredShape,
	shapes,
	selectionMode,
	activeTool,
	isInsideComponent,
	setCanvasOffset,
	selectedShape,
	selectionCanvasRef,
	canvasOffsetStartPosition,
	refreshSelectedShapes,
	setSelectedShape,
	setSelectionFrame,
	setCanvasOffsetStartPosition,
	updateSingleShape,
	gridFormat,
	canvasOffset,
	saveShapes,
	setSelectionMode,
	selectionPadding,
	isShiftPressed
}: UseCanvasType) => {
	const { width, height, scaleRatio } = canvasSize
	const [hoverMode, setHoverMode] = useState<HoverModeData>({
		mode: 'default'
	})
	const { registerDoubleClickEvent, unRegisterDoubleClickEvent } = useDoubleClick()

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent | TouchEvent) =>
			window.requestAnimationFrame(() =>
				handleMove(
					e,
					selectionCanvasRef,
					activeTool,
					gridFormat,
					canvasOffset,
					selectedShape,
					selectionMode,
					canvasOffsetStartPosition,
					width,
					height,
					scaleRatio,
					setHoverMode,
					refreshHoveredShape,
					updateSingleShape,
					setCanvasOffset,
					setSelectedShape,
					refreshSelectedShapes,
					selectionPadding,
					isShiftPressed
				)
			)
		if (isInsideComponent) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('touchmove', handleMouseMove)

			return () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('touchmove', handleMouseMove)
			}
		}
	}, [
		isInsideComponent,
		selectionCanvasRef,
		selectedShape,
		selectionMode,
		gridFormat,
		canvasOffset,
		canvasOffsetStartPosition,
		width,
		height,
		scaleRatio,
		updateSingleShape,
		activeTool,
		setCanvasOffset,
		setSelectedShape,
		refreshHoveredShape,
		refreshSelectedShapes,
		selectionPadding,
		isShiftPressed
	])

	useEffect(() => {
		const handleMouseUp = () => {
			if (selectionMode.mode === 'textedition') return
			if (selectionMode.mode !== 'default') {
				setSelectionMode({ mode: 'default' })
				setSelectionFrame(undefined)
				saveShapes()
			}
		}

		if (isInsideComponent) {
			document.addEventListener('mouseup', handleMouseUp)
			document.addEventListener('touchend', handleMouseUp)
		}

		return () => {
			if (isInsideComponent) {
				document.removeEventListener('mouseup', handleMouseUp)
				document.removeEventListener('touchend', handleMouseUp)
			}
		}
	}, [isInsideComponent, selectionMode, saveShapes, setSelectionFrame, setSelectionMode])

	useEffect(() => {
		const ref = selectionCanvasRef.current
		if (!ref) return
		const ctx = ref.getContext('2d')
		if (!ctx) return
		if (disabled) return

		const handleMouseDown = (e: MouseEvent | TouchEvent) => {
			e.preventDefault()
			const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height, scaleRatio)

			if (activeTool.type === 'selection') {
				const { shape, mode } = selectShape(ctx, shapes, cursorPosition, scaleRatio, canvasOffset, selectedShape, selectionPadding, isTouchGesture(e))
				setSelectedShape(shape)
				setSelectionMode(mode)
				if (!shape) {
					setSelectionFrame([
						[cursorPosition[0], cursorPosition[1]],
						[cursorPosition[0], cursorPosition[1]]
					])
				}
			} else if (activeTool.type === 'move') {
				setCanvasOffsetStartPosition(cursorPosition)
			} else if (ShapeTypeArray.some(item => item === activeTool.type)) {
				const drawCtx = drawCanvasRef.current?.getContext('2d')
				if (!drawCtx) return
				if (activeTool.type === 'brush') {
					if (!!selectedShape && selectedShape.type === 'brush') {
						const newShape = addNewPointGroupToShape(selectedShape, cursorPosition, scaleRatio, selectionPadding)
						updateSingleShape(newShape)
						setSelectedShape(newShape)
					} else {
						const newShape = createShape(drawCtx, activeTool, cursorPosition, gridFormat, scaleRatio, selectionPadding)
						if (!newShape) return
						addShape(newShape)
						setSelectedShape(newShape)
					}

					setSelectionMode({
						mode: 'brush'
					})
				} else if (activeTool.type !== 'picture') {
					const newShape = createShape(
						drawCtx,
						activeTool as Exclude<CustomTool, { type: 'picture' }>,
						cursorPosition,
						gridFormat,
						scaleRatio,
						selectionPadding
					)
					addShape(newShape)
					setActiveTool(SELECTION_TOOL)
					setSelectedShape(newShape)
					setSelectionMode({
						mode: 'resize',
						cursorStartPosition: [cursorPosition[0] + selectionPadding, cursorPosition[1] + selectionPadding],
						originalShape: newShape,
						anchor: activeTool.type === 'line' || activeTool.type === 'polygon' || activeTool.type === 'curve' ? 0 : [1, 1]
					})
				}
			}
		}

		ref.addEventListener('mousedown', handleMouseDown, { passive: false })
		ref.addEventListener('touchstart', handleMouseDown, { passive: false })

		return () => {
			ref.removeEventListener('mousedown', handleMouseDown)
			ref.removeEventListener('touchstart', handleMouseDown)
		}
	}, [
		disabled,
		selectionCanvasRef,
		drawCanvasRef,
		selectedShape,
		activeTool,
		canvasOffset,
		setCanvasOffsetStartPosition,
		shapes,
		width,
		height,
		scaleRatio,
		updateSingleShape,
		addShape,
		setActiveTool,
		setSelectedShape,
		setSelectionMode,
		setSelectionFrame,
		selectionPadding,
		gridFormat
	])

	useEffect(() => {
		const ref = selectionCanvasRef.current
		if (!ref) return

		const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
			if (activeTool.type === 'selection') {
				if (selectedShape?.type === 'text') {
					const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height, scaleRatio)
					if (checkSelectionIntersection(selectedShape, cursorPosition, canvasOffset, selectionPadding, scaleRatio)) {
						setSelectionMode({
							mode: 'textedition',
							defaultValue: selectedShape.value
						})
					}
				}
			}
		}
		if (isInsideComponent) {
			registerDoubleClickEvent(ref, handleDoubleClick)
			return () => {
				unRegisterDoubleClickEvent(ref)
			}
		}
	}, [
		registerDoubleClickEvent,
		unRegisterDoubleClickEvent,
		isInsideComponent,
		selectionCanvasRef,
		activeTool,
		selectedShape,
		width,
		height,
		scaleRatio,
		canvasOffset,
		setSelectionMode,
		selectionPadding
	])

	return { hoverMode }
}

export default useDrawableCanvas
