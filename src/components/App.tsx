import _ from 'lodash/fp'
import React, { useCallback, useRef, useState } from 'react'
import { DrawableShape, Point, StyledShape, ToolEnum, ToolsType } from 'types/Shapes'
import Canvas from './Canvas'
import Layouts from './toolbox/Layouts'
import Toolbox from './toolbox/Toolbox'
import styled from 'styled-components'
import SettingsBox from './toolbox/SettingsBox'
import { STYLE_FONT_DEFAULT } from 'constants/style'

const StyledApp = styled.div<{
  toolboxposition: 'top' | 'left'
  height: number
}>`
  display: flex;
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'column' : 'row')};
  ${({ height }) => `
  width:100%;
  height:${height}px;
  `}
`

const StyledRow = styled.div`
  display: flex;
  flex-direction: row;
`

type AppType = {
  hover?: boolean
  settingsHover?: boolean
  toolboxPosition?: 'top' | 'left'
  width?: number
  height?: number
  withLayouts?: boolean
}

const App = ({
  hover = false,
  settingsHover = false,
  toolboxPosition = 'top',
  width = 1000,
  height = 600,
  withLayouts = true
}: AppType) => {
  const [defaultConf, setDefaultConf] = useState<StyledShape>({
    style: {
      fillColor: 'transparent',
      strokeColor: 'black',
      lineWidth: 1,
      pointsCount: 2,
      fontFamily: STYLE_FONT_DEFAULT
    }
  })
  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(ToolEnum.selection)
  const [selectedShape, setSelectedShape] = useState<DrawableShape | undefined>(undefined)

  const shapesRef = useRef<DrawableShape[]>([])

  const [savedShapes, setSavedShapes] = useState<{
    states: {
      shapes: DrawableShape[]
      selectedShape: DrawableShape | undefined
    }[]
    cursor: number
  }>({
    states: [{ shapes: [], selectedShape: undefined }],
    cursor: 0
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const saveCanvasInFile = useCallback(() => {
    const dataURL = canvasRef.current?.toDataURL('image/png')
    if (!dataURL) return
    const a = document.createElement('a')
    a.href = dataURL
    a.download = 'drawing.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const selectTool = useCallback((tool: ToolsType) => {
    setSelectedShape(undefined)
    setActiveTool(tool)
  }, [])

  const saveShapes = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      return _.isEqual(
        _.get([prevSavedShaped.cursor, 'shapes'], prevSavedShaped.states),
        shapesRef.current
      )
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

  const undoAction = useCallback(() => {
    selectTool(ToolEnum.selection)

    setSavedShapes(prevSavedShaped => {
      const newCursor = Math.max(0, prevSavedShaped.cursor - 1)
      shapesRef.current = _.get([newCursor, 'shapes'], prevSavedShaped.states)
      setSelectedShape(_.get([newCursor, 'selectedShape'], prevSavedShaped.states))
      return _.set('cursor', newCursor, prevSavedShaped)
    })
  }, [selectTool])

  const redoAction = useCallback(() => {
    selectTool(ToolEnum.selection)

    setSavedShapes(prevSavedShaped => {
      const newCursor = Math.min(prevSavedShaped.states.length - 1, prevSavedShaped.cursor + 1)
      shapesRef.current = _.get([newCursor, 'shapes'], prevSavedShaped.states)
      setSelectedShape(_.get([newCursor, 'selectedShape'], prevSavedShaped.states))
      return _.set('cursor', newCursor, prevSavedShaped)
    })
  }, [selectTool])

  const addShape = useCallback((newShape: DrawableShape) => {
    shapesRef.current = [newShape, ...shapesRef.current]
  }, [])

  const updateShape = useCallback(
    (updatedShape: DrawableShape) => {
      shapesRef.current = shapesRef.current.map(marker => {
        return marker.id === selectedShape?.id ? updatedShape : marker
      })
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === updatedShape.id ? updatedShape : prevSelectedShape
      )
    },
    [selectedShape]
  )

  const updateShapes = useCallback(
    (newShapes: DrawableShape[]) => {
      const pureShapes = newShapes.map(shape => _.omit(['chosen'], shape)) as DrawableShape[]
      shapesRef.current = pureShapes
      saveShapes()
    },
    [saveShapes]
  )

  const removeShape = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
      )
      shapesRef.current = _.remove({ id: shape.id }, shapesRef.current)
      saveShapes()
    },
    [saveShapes]
  )

  const clearCanvas = useCallback(() => {
    setSelectedShape(undefined)
    shapesRef.current = []
    setSavedShapes({ states: [{ shapes: [], selectedShape: undefined }], cursor: 0 })
    selectTool(ToolEnum.selection)
    setCanvasOffset([0, 0])
  }, [selectTool])

  const hasActionToUndo = savedShapes.cursor > 0
  const hasActionToRedo = savedShapes.cursor < savedShapes.states.length - 1
  const hasActionToClear = savedShapes.states.length > 1

  return (
    <StyledApp toolboxposition={toolboxPosition} height={height}>
      <Toolbox
        activeTool={activeTool}
        clearCanvas={clearCanvas}
        setSelectedShape={setSelectedShape}
        setActiveTool={selectTool}
        saveCanvasInFile={saveCanvasInFile}
        addShape={addShape}
        hasActionToUndo={hasActionToUndo}
        hasActionToRedo={hasActionToRedo}
        hasActionToClear={hasActionToClear}
        undoAction={undoAction}
        redoAction={redoAction}
        toolboxPosition={toolboxPosition}
        hover={hover}
      />
      <StyledRow>
        <Canvas
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          canvasOffsetStartPosition={canvasOffsetStartPosition}
          setCanvasOffsetStartPosition={setCanvasOffsetStartPosition}
          shapes={shapesRef.current}
          addShape={addShape}
          updateSingleShape={updateShape}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
          canvasOffset={canvasOffset}
          setCanvasOffset={setCanvasOffset}
          defaultConf={defaultConf}
          saveShapes={saveShapes}
          ref={canvasRef}
          width={width}
          height={height}
        />
        {withLayouts && (
          <Layouts
            shapes={shapesRef.current}
            updateShapes={updateShapes}
            selectedShape={selectedShape}
            removeShape={removeShape}
            setSelectedShape={setSelectedShape}
            setActiveTool={setActiveTool}
            hover={hover}
          />
        )}
      </StyledRow>
      {(!settingsHover || selectedShape) && (
        <SettingsBox
          activeTool={activeTool}
          settingsHover={settingsHover}
          selectedShape={selectedShape}
          removeShape={removeShape}
          updateShape={updateShape}
          defaultConf={defaultConf}
          setDefaultConf={setDefaultConf}
          canvas={canvasRef.current}
          givenWidth={width}
          givenHeight={height}
        />
      )}
    </StyledApp>
  )
}

export default App
