import React, { useEffect, useState } from 'react'
import type { UtilsSettings } from '../constants/app'
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
	canvasOffset: Point,
	selectedShape: ShapeEntity | undefined,
	selectionMode: SelectionModeData<Point | number>,
	canvasOffsetStartPosition: Point | undefined,
	setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
	refreshHoveredShape: (
		e: MouseEvent | TouchEvent,
		ctx: CanvasRenderingContext2D,
		cursorPosition: Point,
		canvasOffset: Point,
		settings: UtilsSettings
	) => void,
	updateSingleShape: (updatedShape: ShapeEntity) => void,
	setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>,
	setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>,
	refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, canvasOffset: Point, settings: UtilsSettings) => void,
	settings: UtilsSettings,
	isShiftPressed: boolean
) => {
	const drawCtx = canvasRef.current?.getContext('2d')
	if (!drawCtx) return

	const cursorPosition = getCursorPosition(e, canvasRef.current, settings)

	if (activeTool.type === 'move' && canvasOffsetStartPosition !== undefined) {
		setCanvasOffset([cursorPosition[0] - canvasOffsetStartPosition[0], cursorPosition[1] - canvasOffsetStartPosition[1]])
		return
	}
	if (selectionMode.mode === 'selectionFrame') {
		refreshSelectedShapes(drawCtx, cursorPosition, canvasOffset, settings)
		return
	}

	if (!isTouchGesture(e)) {
		refreshHoveredShape(e, drawCtx, cursorPosition, canvasOffset, settings)
	}

	if (selectedShape === undefined || selectedShape.locked) return

	if (selectionMode.mode === 'default' || selectionMode.mode === 'textedition') {
		const positionIntersection = checkSelectionIntersection(selectedShape, cursorPosition, canvasOffset, settings, true) || {
			mode: 'default'
		}
		setHoverMode(positionIntersection)
	} else {
		const ctx = canvasRef.current?.getContext('2d')
		if (!ctx) return
		const newShape = transformShape(ctx, selectedShape, cursorPosition, canvasOffset, selectionMode, settings, isShiftPressed)
		updateSingleShape(newShape)
		setSelectedShape(newShape)
	}
}

type UseCanvasType = {
	disabled?: boolean
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
		settings: UtilsSettings
	) => void
	refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, canvasOffset: Point, settings: UtilsSettings) => void
	canvasOffsetStartPosition: Point | undefined
	setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
	canvasOffset: Point
	setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
	isInsideComponent: boolean
	selectionMode: SelectionModeData<number | Point>
	setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
	setSelectionFrame: React.Dispatch<React.SetStateAction<[Point, Point] | undefined>>
	drawCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
	selectionCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
	isShiftPressed: boolean
	withFrameSelection: boolean
	settings: UtilsSettings
}

const useDrawableCanvas = ({
	disabled = false,
	addShape,
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
	canvasOffset,
	saveShapes,
	setSelectionMode,
	settings,
	isShiftPressed,
	withFrameSelection
}: UseCanvasType) => {
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
					canvasOffset,
					selectedShape,
					selectionMode,
					canvasOffsetStartPosition,
					setHoverMode,
					refreshHoveredShape,
					updateSingleShape,
					setCanvasOffset,
					setSelectedShape,
					refreshSelectedShapes,
					settings,
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
		canvasOffset,
		canvasOffsetStartPosition,
		updateSingleShape,
		activeTool,
		setCanvasOffset,
		setSelectedShape,
		refreshHoveredShape,
		refreshSelectedShapes,
		settings,
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
			const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, settings)

			if (activeTool.type === 'selection') {
				const { shape, mode } = selectShape(ctx, shapes, cursorPosition, settings, canvasOffset, selectedShape, isTouchGesture(e), withFrameSelection)
				setSelectedShape(shape)
				setSelectionMode(mode)
				if (mode.mode === 'selectionFrame') {
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
						const newShape = addNewPointGroupToShape(selectedShape, cursorPosition, settings)
						updateSingleShape(newShape)
						setSelectedShape(newShape)
					} else {
						const newShape = createShape(drawCtx, activeTool, cursorPosition, settings)
						if (!newShape) return
						addShape(newShape)
						setSelectedShape(newShape)
					}

					setSelectionMode({
						mode: 'brush'
					})
				} else if (activeTool.type !== 'picture') {
					const newShape = createShape(drawCtx, activeTool as Exclude<CustomTool, { type: 'picture' }>, cursorPosition, settings)
					addShape(newShape)
					setActiveTool(SELECTION_TOOL)
					setSelectedShape(newShape)
					setSelectionMode({
						mode: 'resize',
						cursorStartPosition: [cursorPosition[0] + settings.selectionPadding, cursorPosition[1] + settings.selectionPadding],
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
		updateSingleShape,
		addShape,
		setActiveTool,
		setSelectedShape,
		setSelectionMode,
		setSelectionFrame,
		settings,
		withFrameSelection
	])

	useEffect(() => {
		const ref = selectionCanvasRef.current
		if (!ref) return

		const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
			if (activeTool.type === 'selection') {
				if (selectedShape?.type === 'text') {
					const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, settings)
					if (checkSelectionIntersection(selectedShape, cursorPosition, canvasOffset, settings)) {
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
		canvasOffset,
		setSelectionMode,
		settings
	])

	return { hoverMode }
}

export default useDrawableCanvas
