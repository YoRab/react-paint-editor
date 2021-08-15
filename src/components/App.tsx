import _ from 'lodash/fp'
import React, { useCallback, useState } from 'react'
import { DrawableShape, ShapeType, StyledShape } from 'types/Shapes'
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
  const [activeTool, setActiveTool] = useState<ShapeType | undefined>(undefined)
  const [selectedShape, setSelectedShape] = useState<DrawableShape | undefined>(undefined)
  const [shapes, setShapes] = useState<DrawableShape[]>([
    // {
    //   type: ShapeType.line,
    //   id: _.uniqueId('line_'),
    //   points: [
    //     [20, 30],
    //     [50, 100]
    //   ],
    //   translationOnceRotated: [0, 0],
    //   translationBeforeRotation: [0, 0],
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
    //   translationOnceRotated: [0, 0],
    //   translationBeforeRotation: [0, 0],
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
    //   translationOnceRotated: [0, 0],
    //   translationBeforeRotation: [0, 0],
    //   rotation: 0
    // }
  ])

  const updateShape = useCallback((shape: DrawableShape) => {
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape?.id === shape.id ? shape : prevSelectedShape
    )
    setShapes(prevShapes =>
      prevShapes.map(prevShape => {
        return prevShape.id === shape.id ? shape : prevShape
      })
    )
  }, [])

  const removeShape = useCallback((shape: DrawableShape) => {
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
    )
    setShapes(prevMakers => _.remove({ id: shape.id }, prevMakers))
  }, [])

  const selectTool = useCallback((tool: ShapeType | undefined) => {
    setActiveTool(tool)
    setSelectedShape(undefined)
  }, [])

  return (
    <StyledApp>
      <Toolbox
        activeTool={activeTool}
        setSelectedShape={setSelectedShape}
        setActiveTool={selectTool}
        setShapes={setShapes}
      />
      <StyledRow>
        <Canvas
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          shapes={shapes}
          setShapes={setShapes}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
          defaultConf={defaultConf}
        />
        <Layouts
          shapes={shapes}
          setMarkers={setShapes}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
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
