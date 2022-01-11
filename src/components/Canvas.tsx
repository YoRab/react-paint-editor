import React, {
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import styled from 'styled-components'
import _ from 'lodash/fp'
import { selectShape } from 'utils/selection'
import {
  DrawableBrush,
  DrawableShape,
  DrawableText,
  Point,
  ShapeEnum,
  StyledShape,
  ToolEnum,
  ToolsType
} from 'types/Shapes'
import { checkPositionIntersection, getCursorPosition } from 'utils/intersect'
import { drawSelection, drawShape } from 'utils/draw'
import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { calculateTextWidth, createNewPointGroupToShape, transformShape } from 'utils/transform'
import { FRAMERATE_DRAW, FRAMERATE_SELECTION } from 'constants/draw'
import EditTextBox from './toolbox/EditTextBox'
import { createShape } from 'utils/data'

const drawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  width: number,
  height: number,
  activeTool: ToolsType,
  canvasOffset: Point,
  shapes: DrawableShape[],
  selectedShape: DrawableShape | undefined
) => {
  drawCtx.clearRect(0, 0, width, height)
  selectionCtx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode !== SelectionModeLib.textedition || shapes[i] !== selectedShape) {
      drawShape(drawCtx, shapes[i], canvasOffset)
    }
  }
  selectedShape &&
    activeTool !== ShapeEnum.brush &&
    drawSelection({
      ctx: selectionCtx,
      shape: selectedShape,
      canvasOffset,
      withAnchors: selectionMode.mode !== SelectionModeLib.textedition
    })
}

const throttledDrawCanvas = _.throttle(FRAMERATE_DRAW, drawCanvas)

const handleSelection = (
  e: MouseEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  activeTool: ToolsType,
  canvasOffset: Point,
  selectedShape: DrawableShape | undefined,
  selectionMode: SelectionModeData<Point | number>,
  canvasOffsetStartPosition: Point | undefined,
  width: number,
  height: number,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  updateSingleShape: (updatedShape: DrawableShape) => void,
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>,
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
) => {
  if (activeTool === ToolEnum.move && canvasOffsetStartPosition !== undefined) {
    const cursorPosition = getCursorPosition(e, canvasRef.current, width, height)
    setCanvasOffset([
      cursorPosition[0] - canvasOffsetStartPosition[0],
      cursorPosition[1] - canvasOffsetStartPosition[1]
    ])
  }
  if (selectedShape == undefined) return
  const cursorPosition = getCursorPosition(e, canvasRef.current, width, height)

  if (selectionMode.mode === SelectionModeLib.default) {
    const positionIntersection = checkPositionIntersection(
      selectedShape,
      cursorPosition,
      canvasOffset,
      true
    ) || {
      mode: SelectionModeLib.default
    }
    setHoverMode(positionIntersection)
  } else {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const newShape = transformShape(ctx, selectedShape, cursorPosition, canvasOffset, selectionMode)
    updateSingleShape(newShape)
    setSelectedShape(newShape)
  }
}

const throttledHandleSelection = _.throttle(FRAMERATE_SELECTION, handleSelection)

const StyledCanvasBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: lightgray;
`

const StyledCanvasContainer = styled.div`
  position: relative;
  background: white;
  overflow: hidden;
`

const StyledDrawCanvas = styled.canvas.attrs<{
  width: number
  height: number
  ref: RefObject<HTMLCanvasElement>
}>(({ width, height }) => ({
  width: width,
  height: height
}))<{
  width: number
  height: number
}>`
  position: absolute;
  user-select: none;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
`

const StyledSelectionCanvas = styled.canvas.attrs<{
  width: number
  height: number
  ref: RefObject<HTMLCanvasElement>
}>(({ width, height }) => ({
  width: width,
  height: height
}))<{
  activetool: ToolsType
  selectionmode: SelectionModeLib
  width: number
  height: number
}>`
  user-select: none;
  position: relative;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */

  ${({ selectionmode, activetool }) =>
    (activetool !== ToolEnum.selection && activetool !== ToolEnum.move) ||
    selectionmode === SelectionModeLib.resize
      ? 'cursor: crosshair'
      : activetool === ToolEnum.move || selectionmode === SelectionModeLib.translate
      ? 'cursor:move'
      : selectionmode === SelectionModeLib.rotate
      ? 'cursor:grab'
      : 'cursor:default'}
`

type DrawerType = {
  width: number
  height: number
  shapes: DrawableShape[]
  saveShapes: () => void
  addShape: (newShape: DrawableShape) => void
  updateSingleShape: (updatedShape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  canvasOffsetStartPosition: Point | undefined
  setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
  canvasOffset: Point
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
  defaultConf: StyledShape
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
  (
    {
      width,
      height,
      shapes,
      addShape,
      updateSingleShape,
      selectedShape,
      setSelectedShape,
      saveShapes,
      activeTool,
      setActiveTool,
      canvasOffsetStartPosition,
      setCanvasOffsetStartPosition,
      canvasOffset,
      setCanvasOffset,
      defaultConf,
      isInsideComponent,
      selectionMode,
      setSelectionMode
    },
    ref
  ) => {
    const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    useImperativeHandle(ref, () => drawCanvasRef.current!)

    const [hoverMode, setHoverMode] = useState<HoverModeData>({ mode: SelectionModeLib.default })

    const handleDoubleClick = useCallback(
      e => {
        if (activeTool === ToolEnum.selection) {
          if (selectedShape?.type === ShapeEnum.text) {
            const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)
            if (checkPositionIntersection(selectedShape, cursorPosition, canvasOffset)) {
              setSelectionMode({
                mode: SelectionModeLib.textedition,
                defaultValue: selectedShape.value
              })
            }
          }
        }
      },
      [activeTool, selectedShape, width, height, canvasOffset, setSelectionMode]
    )

    const handleMouseDown = useCallback(
      e => {
        // eslint-disable-next-line
        // e.preventDefault()
        const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)

        if (activeTool === ToolEnum.selection) {
          const { shape, mode } = selectShape(shapes, cursorPosition, canvasOffset, selectedShape)
          setSelectedShape(shape)
          setSelectionMode(mode)
        } else if (activeTool === ToolEnum.move) {
          setCanvasOffsetStartPosition(cursorPosition)
        }
        if (_.includes(activeTool, ShapeEnum)) {
          const drawCtx = drawCanvasRef.current?.getContext('2d')
          if (!drawCtx) return
          if (activeTool === ShapeEnum.brush) {
            if (!!selectedShape) {
              const newShape = createNewPointGroupToShape(
                selectedShape as DrawableBrush,
                cursorPosition
              )
              updateSingleShape(newShape)
              setSelectedShape(newShape)
            } else {
              const newShape = createShape(
                drawCtx,
                activeTool as ShapeEnum,
                cursorPosition,
                defaultConf
              )
              addShape(newShape)
              setSelectedShape(newShape)
            }

            setSelectionMode({
              mode: SelectionModeLib.brush
            })
          } else if (activeTool !== ShapeEnum.text) {
            const newShape = createShape(
              drawCtx,
              activeTool as ShapeEnum,
              cursorPosition,
              defaultConf
            )
            addShape(newShape)
            setActiveTool(ToolEnum.selection)
            setSelectedShape(newShape)

            setSelectionMode({
              mode: SelectionModeLib.resize,
              cursorStartPosition: cursorPosition,
              originalShape: newShape,
              anchor: activeTool === ShapeEnum.line || activeTool === ShapeEnum.polygon ? 0 : [1, 1]
            })
          }
        }
      },
      [
        selectedShape,
        activeTool,
        canvasOffset,
        setCanvasOffsetStartPosition,
        shapes,
        defaultConf,
        width,
        height,
        updateSingleShape,
        addShape,
        setActiveTool,
        setSelectedShape,
        setSelectionMode
      ]
    )

    const handleMouseUp = useCallback(
      e => {
        if (selectionMode.mode === SelectionModeLib.textedition) return
        if (activeTool === ShapeEnum.text) {
          const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)
          const drawCtx = drawCanvasRef.current?.getContext('2d')
          if (!drawCtx) return
          const newShape = createShape(
            drawCtx,
            activeTool as ShapeEnum,
            cursorPosition,
            defaultConf
          ) as DrawableText
          addShape(newShape)
          setActiveTool(ToolEnum.selection)
          setSelectedShape(newShape)
          setSelectionMode({
            mode: SelectionModeLib.textedition,
            defaultValue: newShape.value
          })
          return
        }
        if (selectionMode.mode !== SelectionModeLib.default) {
          setSelectionMode({ mode: SelectionModeLib.default })
          saveShapes()
        }
      },
      [
        selectionMode,
        saveShapes,
        activeTool,
        addShape,
        defaultConf,
        width,
        height,
        setActiveTool,
        setSelectedShape,
        setSelectionMode
      ]
    )

    const handleMouseMove = useCallback(
      e => {
        throttledHandleSelection(
          e,
          selectionCanvasRef,
          activeTool,
          canvasOffset,
          selectedShape,
          selectionMode,
          canvasOffsetStartPosition,
          width,
          height,
          setHoverMode,
          updateSingleShape,
          setCanvasOffset,
          setSelectedShape
        )
      },
      [
        selectedShape,
        selectionMode,
        setHoverMode,
        canvasOffset,
        canvasOffsetStartPosition,
        width,
        height,
        updateSingleShape,
        activeTool,
        setCanvasOffset,
        setSelectedShape
      ]
    )

    const updateSelectedShapeText = useCallback(
      (newText: string[]) => {
        if (selectedShape?.type !== ShapeEnum.text) return

        const ctx = drawCanvasRef.current?.getContext('2d')
        if (!ctx) return
        const newShape = _.set('value', newText, selectedShape)
        const newWidth = calculateTextWidth(
          ctx,
          newShape.value,
          newShape.fontSize,
          newShape.style?.fontFamily
        )
        const resizedShape = {
          ...newShape,
          width: newWidth,
          height: newShape.fontSize * newShape.value.length
        }
        updateSingleShape(resizedShape)
      },
      [updateSingleShape, selectedShape]
    )

    useEffect(() => {
      const drawCtx = drawCanvasRef.current?.getContext('2d')
      const selectionCtx = selectionCanvasRef.current?.getContext('2d')
      drawCtx &&
        selectionCtx &&
        throttledDrawCanvas(
          drawCtx,
          selectionCtx,
          selectionMode,
          width,
          height,
          activeTool,
          canvasOffset,
          shapes,
          selectedShape
        )
    }, [shapes, selectionMode, selectedShape, activeTool, canvasOffset, width, height])

    useEffect(() => {
      if (isInsideComponent) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('touchmove', handleMouseMove)
      }

      return () => {
        if (isInsideComponent) {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('touchmove', handleMouseMove)
        }
      }
    }, [isInsideComponent, handleMouseMove])

    useEffect(() => {
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
    }, [isInsideComponent, handleMouseUp])

    return (
      <StyledCanvasBox>
        <StyledCanvasContainer>
          <StyledDrawCanvas ref={drawCanvasRef} width={width} height={height} />
          <StyledSelectionCanvas
            activetool={activeTool}
            selectionmode={hoverMode.mode}
            onTouchStart={handleMouseDown}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            ref={selectionCanvasRef}
            width={width}
            height={height}
          />
          {selectionMode.mode === SelectionModeLib.textedition &&
            selectedShape?.type === ShapeEnum.text && (
              <EditTextBox
                shape={selectedShape}
                defaultValue={selectionMode.defaultValue}
                updateValue={updateSelectedShapeText}
              />
            )}
        </StyledCanvasContainer>
      </StyledCanvasBox>
    )
  }
)

export default Canvas
