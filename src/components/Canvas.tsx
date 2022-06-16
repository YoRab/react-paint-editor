import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { styled } from '@linaria/react'
import _ from 'lodash/fp'
import { DrawableShape, Point, ShapeEnum, StyledShape } from 'types/Shapes'
import { drawSelection, drawShape } from 'utils/draw'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import { calculateTextWidth } from 'utils/transform'
import EditTextBox from './toolbox/EditTextBox'
import useDrawableCanvas from 'hooks/useDrawableCanvas'
import { encodedTransparentIcon } from 'constants/icons'
import { ActionsEnum, ToolsType } from 'types/tools'

const renderDrawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  },
  canvasOffset: Point,
  shapes: DrawableShape[],
  selectionPadding: number,
  selectedShape: DrawableShape | undefined
) => {
  const { width, height, scaleRatio } = canvasSize
  drawCtx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode !== SelectionModeLib.textedition || shapes[i] !== selectedShape) {
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
  selectedShape: DrawableShape | undefined
) => {
  const { width, height, scaleRatio } = canvasSize
  selectionCtx.clearRect(0, 0, width, height)
  selectedShape &&
    activeTool.type !== ShapeEnum.brush &&
    drawSelection({
      ctx: selectionCtx,
      shape: selectedShape,
      scaleRatio,
      canvasOffset,
      selectionPadding,
      selectionWidth,
      selectionColor,
      withAnchors: selectionMode.mode !== SelectionModeLib.textedition
    })
}

const StyledCanvasBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StyledCanvasContainer = styled.div`
  position: relative;
  background-color: var(--canvas-bg);
  background-repeat: repeat;
  background-size: 16px;
  overflow: hidden;
  display: grid;

  &[data-grid='true'] {
    background-image: url('data:image/svg+xml,${encodedTransparentIcon}');
  }

  &[data-grow='true'] {
    width: 100%;
    height: 100%;
  }
`

const StyledDrawCanvas = styled.canvas`
  user-select: none;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
  display: block;
  grid-area: 1 / 1;

  &[data-grow='true'] {
    width: 100%;
  }
`

const StyledSelectionCanvas = styled.canvas<{
  cursor: string
}>`
  user-select: none;
  position: relative;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
  display: block;
  grid-area: 1 / 1;
  cursor: ${({ cursor }) => cursor};

  &[data-grow='true'] {
    width: 100%;
  }
`

type DrawerType = {
  withGrid: boolean
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
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
  (
    {
      withGrid,
      canGrow,
      disabled = false,
      canvasSize,
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
      isInsideComponent,
      selectionMode,
      setSelectionMode,
      selectionWidth,
      selectionColor,
      selectionPadding,
      isEditMode
    },
    ref
  ) => {
    const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      setCanvasOffsetStartPosition,
      updateSingleShape,
      canvasOffset,
      saveShapes,
      setSelectionMode,
      selectionPadding
    })

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

      drawCtx &&
        window.requestAnimationFrame(() =>
          renderDrawCanvas(
            drawCtx,
            selectionMode,
            canvasSize,
            canvasOffset,
            shapes,
            selectionPadding,
            selectedShape
          )
        )
    }, [shapes, selectionMode, selectedShape, canvasOffset, canvasSize, selectionPadding])

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
            selectedShape
          )
        )
    }, [
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
      <StyledCanvasBox>
        <StyledCanvasContainer data-grid={withGrid} data-grow={canGrow}>
          <StyledDrawCanvas
            ref={drawCanvasRef}
            data-grow={canGrow}
            width={canvasSize.width}
            height={canvasSize.height}
          />
          {isEditMode && (
            <StyledSelectionCanvas
              ref={selectionCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              data-grow={canGrow}
              cursor={
                (activeTool.type !== ActionsEnum.selection && activeTool.type !== ActionsEnum.move) ||
                hoverMode.mode === SelectionModeLib.resize
                  ? 'crosshair'
                  : activeTool.type === ActionsEnum.move || hoverMode.mode === SelectionModeLib.translate
                  ? 'move'
                  : hoverMode.mode === SelectionModeLib.rotate
                  ? 'grab'
                  : 'default'
              }
            />
          )}
          {isEditMode &&
            selectionMode.mode === SelectionModeLib.textedition &&
            selectedShape?.type === ShapeEnum.text && (
              <EditTextBox
                scaleRatio={canvasSize.scaleRatio}
                disabled={disabled}
                shape={selectedShape}
                defaultValue={selectionMode.defaultValue}
                updateValue={updateSelectedShapeText}
                selectionPadding={selectionPadding}
              />
            )}
        </StyledCanvasContainer>
      </StyledCanvasBox>
    )
  }
)

export default Canvas
