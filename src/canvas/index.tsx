import React, { useCallback, useRef, useState } from 'react'
import useKeyboard from '@canvas/hooks/useKeyboard'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import Canvas from '@canvas/components/Canvas'
import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
import './index.css'
import { STYLE_ZINDEX } from '@editor/constants/style'

const App = (props: UseReactPaintReturnType) => {
	const {
		shapesRef,
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
		saveShapes,
		refs,
		width,
		height,
		settings,
		canvasSize,
		setCanvasSize,
		setCanvasOffset,
		selectShape,
		activeTool,
		setActiveTool,
		isInsideComponent,
		isEditMode,
		isDisabled,
		canvas: {
			style: { canvasSelectionColor, canvasSelectionWidth },
			withSkeleton,
			withFrameSelection,
			canGrow
		}
	} = props

	const containerRef = useRef<HTMLDivElement>(null)

	const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(undefined)

	const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
		mode: 'default'
	})

	const [isShiftPressed, setShiftPressed] = useState<boolean>(false)

	const pasteShape = useCallback(
		(shape: ShapeEntity) => {
			addShape(shape)
			selectShape(shape)
		},
		[addShape, selectShape]
	)

	const onResized = useCallback(
		(measuredWidth: number) => {
			const scaleRatio = measuredWidth / width
			setCanvasSize({ width: measuredWidth, height: height * scaleRatio, scaleRatio })
		},
		[width, height, setCanvasSize]
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

	useResizeObserver({ element: containerRef, onResized })

	return (
		<div
			ref={containerRef}
			className='react-paint-editor-app-row'
			data-grow={canGrow}
			style={{
				'--react-paint-editor-app-row-zindex': STYLE_ZINDEX.APP,
				'--react-paint-editor-app-row-width': canvasSize.width,
				'--react-paint-editor-app-row-aspectratio': `calc(${canvasSize.width} / ${canvasSize.height})`
			}}
		>
			<Canvas
				ref={refs.canvas}
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
		</div>
	)
}

export default App
