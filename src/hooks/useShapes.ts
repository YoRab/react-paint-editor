import { useCallback, useEffect, useRef, useState } from 'react'
import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME } from 'src/constants/app'
import { checkPositionIntersection, checkSelectionIntersection } from 'src/utils/intersect'
import { PICTURE_DEFAULT_SIZE } from '../constants/picture'
import type { Point, ShapeEntity } from '../types/Shapes'
import { isEqual, omit, set } from '../utils/object'
import { refreshShape } from '../utils/shapes/index'
import { createPicture } from '../utils/shapes/picture'

const useShapes = (
	onDataChanged: (() => void) | undefined,
	selectionPadding: number,
	canvasSize: {
		width: number
		height: number
		scaleRatio: number
	}
) => {
	const shapesRef = useRef<ShapeEntity[]>([])
	const onDataChangedRef = useRef<(() => void) | undefined>(onDataChanged)
	onDataChangedRef.current = onDataChanged

	const [selectedShape, setSelectedShape] = useState<ShapeEntity | undefined>(undefined)
	const [hoveredShape, setHoveredShape] = useState<ShapeEntity | undefined>(undefined)

	const [savedShapes, setSavedShapes] = useState<{
		states: {
			shapes: ShapeEntity[]
			selectedShape: ShapeEntity | undefined
		}[]
		cursor: number
	}>({
		states: [{ shapes: [], selectedShape: undefined }],
		cursor: 0
	})

	const canGoBackward = savedShapes.cursor > 0
	const canGoForward = savedShapes.cursor < savedShapes.states.length - 1
	const canClear = shapesRef.current.length > 0

	const saveShapes = useCallback(() => {
		setSavedShapes(prevSavedShaped => {
			return isEqual(prevSavedShaped.states[prevSavedShaped.cursor].shapes, shapesRef.current)
				? prevSavedShaped
				: {
						states: [
							...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
							{
								shapes: shapesRef.current,
								selectedShape
							}
						],
						cursor: prevSavedShaped.cursor + 1
				  }
		})
	}, [selectedShape])

	const addShape = useCallback((newShape: ShapeEntity) => {
		shapesRef.current = [newShape, ...shapesRef.current]
	}, [])

	const refreshHoveredShape = useCallback(
		(e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, canvasOffset: Point, currentScale: number) => {
			if (e.target && 'className' in e.target && ![DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME].includes(e.target.className as string)) {
				setHoveredShape(undefined)
				return
			}

			const foundShape = shapesRef.current.find(shape => {
				return shape.id === selectedShape?.id
					? !!checkSelectionIntersection(selectedShape, cursorPosition, canvasOffset, selectionPadding, currentScale)
					: !!checkPositionIntersection(ctx, shape, cursorPosition, canvasOffset, selectionPadding, currentScale)
			})
			setHoveredShape(foundShape)
		},
		[selectionPadding, selectedShape]
	)

	const addPictureShape = useCallback(
		async (fileOrUrl: File | string, maxWidth = PICTURE_DEFAULT_SIZE, maxHeight = PICTURE_DEFAULT_SIZE) => {
			const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight, canvasSize.scaleRatio, selectionPadding)
			addShape(pictureShape)
			saveShapes()
			return pictureShape
		},
		[addShape, saveShapes, canvasSize, selectionPadding]
	)

	const updateShape = useCallback(
		(updatedShape: ShapeEntity, withSave = false) => {
			shapesRef.current = shapesRef.current.map(marker => {
				return marker.id === selectedShape?.id ? updatedShape : marker
			})
			setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === updatedShape.id ? updatedShape : prevSelectedShape))
			withSave && saveShapes()
		},
		[selectedShape, saveShapes]
	)

	const updateShapes = useCallback(
		(newShapes: ShapeEntity[]) => {
			const pureShapes = newShapes.map(shape => omit(['chosen'], shape))
			shapesRef.current = pureShapes
			saveShapes()
		},
		[saveShapes]
	)

	const removeShape = useCallback(
		(shape: ShapeEntity) => {
			setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape))
			shapesRef.current = shapesRef.current.filter(item => item.id !== shape.id)
			saveShapes()
		},
		[saveShapes]
	)

	const moveCursor = useCallback((getNewCursor: (shapes: typeof savedShapes) => number) => {
		setSavedShapes(prevSavedShaped => {
			const newCursor = getNewCursor(prevSavedShaped)
			shapesRef.current = prevSavedShaped.states[newCursor].shapes
			setSelectedShape(prevSavedShaped.states[newCursor].selectedShape)
			return set('cursor', newCursor, prevSavedShaped)
		})
	}, [])

	const backwardShape = useCallback(() => {
		moveCursor(prevSavedShaped => Math.max(0, prevSavedShaped.cursor - 1))
	}, [moveCursor])

	const forwardShape = useCallback(() => {
		moveCursor(prevSavedShaped => Math.min(prevSavedShaped.states.length - 1, prevSavedShaped.cursor + 1))
	}, [moveCursor])

	const clearShapes = useCallback((shapesToInit: ShapeEntity[] = [], clearHistory = false) => {
		setSelectedShape(undefined)
		shapesRef.current = shapesToInit
		setSavedShapes(prevSavedShaped => {
			return clearHistory
				? {
						states: [{ shapes: shapesToInit, selectedShape: undefined }],
						cursor: 0
				  }
				: {
						states: [
							...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
							{
								shapes: shapesToInit,
								selectedShape: undefined
							}
						],
						cursor: prevSavedShaped.cursor + 1
				  }
		})
	}, [])

	const moveShapes = useCallback(
		(firstShapeId: string, lastShapeId: string) => {
			const shapes = shapesRef.current
			const firstShapeIndex = shapes.findIndex(shape => shape.id === firstShapeId)
			const lastShapeIndex = shapes.findIndex(shape => shape.id === lastShapeId)

			// todo utils
			if (firstShapeIndex < lastShapeIndex) {
				updateShapes([
					...shapes.slice(0, firstShapeIndex),
					...shapes.slice(firstShapeIndex + 1, lastShapeIndex + 1),
					shapes[firstShapeIndex],
					...shapes.slice(lastShapeIndex + 1, shapes.length)
				])
			} else {
				updateShapes([
					...shapes.slice(0, lastShapeIndex),
					shapes[firstShapeIndex],
					...shapes.slice(lastShapeIndex, firstShapeIndex),
					...shapes.slice(firstShapeIndex + 1, shapes.length)
				])
			}
		},
		[updateShapes]
	)

	const toggleShapeVisibility = useCallback(
		(shape: ShapeEntity) => {
			const shapes = shapesRef.current
			const shapeIndex = shapes.findIndex(item => item.id === shape.id)
			if (shapeIndex < 0) return
			const newShape = set('visible', shape.visible === false, shape)
			setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === newShape.id ? newShape : prevSelectedShape))
			updateShapes(set(shapeIndex, newShape, shapes))
		},
		[updateShapes]
	)

	const toggleShapeLock = useCallback(
		(shape: ShapeEntity) => {
			const shapes = shapesRef.current
			const shapeIndex = shapes.findIndex(item => item.id === shape.id)
			if (shapeIndex < 0) return
			const newShape = set('locked', !shape.locked, shape)
			setSelectedShape(prevSelectedShape => (prevSelectedShape?.id === newShape.id ? newShape : prevSelectedShape))
			updateShapes(set(shapeIndex, newShape, shapes))
		},
		[updateShapes]
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: function must be called everytime savedShapes is updated
	useEffect(() => {
		onDataChangedRef.current?.()
	}, [savedShapes])

	useEffect(() => {
		shapesRef.current = shapesRef.current.map(shape => refreshShape(shape, canvasSize.scaleRatio, selectionPadding))
		setSelectedShape(prevSelectedShape =>
			prevSelectedShape === undefined ? undefined : shapesRef.current.find(shape => shape.id === prevSelectedShape.id)
		)
	}, [canvasSize, selectionPadding])

	return {
		shapesRef,
		selectedShape,
		hoveredShape,
		addShape,
		addPictureShape,
		moveShapes,
		saveShapes,
		setSelectedShape,
		refreshHoveredShape,
		toggleShapeVisibility,
		toggleShapeLock,
		removeShape,
		updateShape,
		backwardShape,
		forwardShape,
		clearShapes,
		canGoBackward,
		canGoForward,
		canClear
	}
}

export default useShapes
