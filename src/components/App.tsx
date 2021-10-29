import _ from 'lodash/fp'
import React, { useCallback, useEffect, useState } from 'react'
import { DrawableShape, Point, StyledShape, ToolEnum, ToolsType } from 'types/Shapes'
import Canvas from './Canvas'
import Layouts from './toolbox/Layouts'
import Toolbox from './toolbox/Toolbox'
import styled from 'styled-components'
import SettingsBox from './toolbox/SettingsBox'

const StyledApp = styled.div`
  display: flex;
  flex-direction: column;
`

const StyledRow = styled.div`
  display: flex;
  flex-direction: row;
`

const App = () => {
  const [defaultConf, setDefaultConf] = useState<StyledShape>({
    style: {
      fillColor: 'transparent',
      strokeColor: 'black',
      lineWidth: 1
    }
  })
  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(ToolEnum.selection)
  const [selectedShape, setSelectedShape] = useState<DrawableShape | undefined>(undefined)
  const [shapes, setShapes] = useState<DrawableShape[]>([
    // {
    //   type: ShapeType.line,
    //   id: _.uniqueId('line_'),
    //   points: [
    //     [20, 30],
    //     [500, 100]
    //   ],
    //   translation: [0, 0],
    //   rotation: 0
    // },
    // {
    //   type: ShapeType.polygon,
    //   id: _.uniqueId(''),
    //   points: [
    //     [40, 20],
    //     [100, 100],
    //     [150, 250],
    //     [20, 40],
    //     [150, 200]
    //   ],
    //   translation: [0, 0],
    //   rotation: 0
    // },
    // {
    //   type: ShapeType.polygon,
    //   id: _.uniqueId(''),
    //   points: [
    //     [40, 20],
    //     [80, 20],
    //     [120, 40],
    //     [80, 80]
    //   ],
    //   translation: [0, 0],
    //   rotation: 0
    // }
  ])

  const [savedShapes, setSavedShapes] = useState<{
    states: DrawableShape[][]
    cursor: number
  }>({
    states: [shapes],
    cursor: 0
  })

  const saveShapes = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      return _.isEqual(_.get(prevSavedShaped.cursor, prevSavedShaped.states), shapes)
        ? prevSavedShaped
        : {
            states: [...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1), shapes],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [shapes])

  const selectTool = useCallback((tool: ToolsType) => {
    setActiveTool(tool)
    setSelectedShape(undefined)
  }, [])

  const undoAction = useCallback(() => {
    setSelectedShape(undefined)
    setSavedShapes(prevSavedShaped => {
      return _.set('cursor', Math.max(0, prevSavedShaped.cursor - 1), prevSavedShaped)
    })
    selectTool(ToolEnum.selection)
  }, [selectTool])

  const redoAction = useCallback(() => {
    setSelectedShape(undefined)

    setSavedShapes(prevSavedShaped => {
      return _.set(
        'cursor',
        Math.min(prevSavedShaped.states.length - 1, prevSavedShaped.cursor + 1),
        prevSavedShaped
      )
    })
    selectTool(ToolEnum.selection)
  }, [selectTool])

  const updateShape = useCallback((shape: DrawableShape) => {
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape?.id === shape.id ? shape : prevSelectedShape
    )
    setSavedShapes(prevSavedShaped => {
      const currentSavedShapes = _.get(prevSavedShaped.cursor, prevSavedShaped.states) || []
      if (_.isEmpty(currentSavedShapes)) return prevSavedShaped
      const newShapes = currentSavedShapes.map(prevShape => {
        return prevShape.id === shape.id ? shape : prevShape
      })

      return _.isEqual(currentSavedShapes, newShapes)
        ? prevSavedShaped
        : {
            states: [...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1), newShapes],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [])

  const updateShapes = useCallback((newShapes: DrawableShape[]) => {
    setSavedShapes(prevSavedShaped => {
      const pureShapes = newShapes.map(shape => _.omit(['chosen'], shape)) as DrawableShape[]

      const currentSavedShapes = (_.get(prevSavedShaped.cursor, prevSavedShaped.states) || []).map(
        shape => _.omit(['chosen'], shape)
      )
      if (_.isEmpty(currentSavedShapes)) return prevSavedShaped

      return _.isEqual(currentSavedShapes, pureShapes)
        ? prevSavedShaped
        : {
            states: [...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1), pureShapes],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [])

  const removeShape = useCallback((shape: DrawableShape) => {
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
    )
    setSavedShapes(prevSavedShaped => {
      const currentSavedShapes = _.get(prevSavedShaped.cursor, prevSavedShaped.states) || []
      if (_.isEmpty(currentSavedShapes)) return prevSavedShaped
      const newShapes = _.remove({ id: shape.id }, currentSavedShapes)

      return _.isEqual(currentSavedShapes, newShapes)
        ? prevSavedShaped
        : {
            states: [...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1), newShapes],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [])

  const clearCanvas = useCallback(() => {
    setSelectedShape(undefined)

    setSavedShapes(prevSavedShaped => {
      return _.isEmpty(_.get(prevSavedShaped.cursor, prevSavedShaped.states))
        ? prevSavedShaped
        : {
            states: [...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1), []],
            cursor: prevSavedShaped.cursor + 1
          }
    })
    selectTool(ToolEnum.selection)
    setCanvasOffset([0, 0])
  }, [selectTool])

  useEffect(() => {
    setShapes(() => {
      return _.get(savedShapes.cursor, savedShapes.states) ?? []
    })
  }, [savedShapes])

  const hasActionToUndo = savedShapes.cursor > 0
  const hasActionToRedo = savedShapes.cursor < savedShapes.states.length - 1

  return (
    <StyledApp>
      <Toolbox
        activeTool={activeTool}
        clearCanvas={clearCanvas}
        setSelectedShape={setSelectedShape}
        setActiveTool={selectTool}
        setShapes={setShapes}
        hasActionToUndo={hasActionToUndo}
        hasActionToRedo={hasActionToRedo}
        undoAction={undoAction}
        redoAction={redoAction}
      />
      <StyledRow>
        <Canvas
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          canvasOffsetStartPosition={canvasOffsetStartPosition}
          setCanvasOffsetStartPosition={setCanvasOffsetStartPosition}
          shapes={shapes}
          setShapes={setShapes}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
          canvasOffset={canvasOffset}
          setCanvasOffset={setCanvasOffset}
          defaultConf={defaultConf}
          saveShapes={saveShapes}
        />
        <Layouts
          shapes={_.get(savedShapes.cursor, savedShapes.states)}
          updateShapes={updateShapes}
          selectedShape={selectedShape}
          removeShape={removeShape}
          setSelectedShape={setSelectedShape}
          setActiveTool={setActiveTool}
        />
      </StyledRow>
      <SettingsBox
        activeTool={activeTool}
        selectedShape={selectedShape}
        removeShape={removeShape}
        updateShape={updateShape}
        defaultConf={defaultConf}
        setDefaultConf={setDefaultConf}
      />
    </StyledApp>
  )
}

export default App
