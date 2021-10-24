import _ from 'lodash/fp'
import React, { useCallback, useEffect, useState } from 'react'
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

  const [savedShapes, setSavedShapes] = useState<DrawableShape[][]>([shapes])

  const saveShapes = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      return _.isEqual(_.last(prevSavedShaped), shapes)
        ? prevSavedShaped
        : [...prevSavedShaped, shapes]
    })
  }, [shapes])

  const cancelMove = useCallback(() => {
    setSelectedShape(undefined)
    setSavedShapes(prevSavedShaped => {
      return _.slice(0, -1, prevSavedShaped)
    })
  }, [])

  const updateShape = useCallback((shape: DrawableShape) => {
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape?.id === shape.id ? shape : prevSelectedShape
    )
    setSavedShapes(prevSavedShaped => {
      const prevShapes = _.last(prevSavedShaped) || []
      if (_.isEmpty(prevShapes)) return prevSavedShaped
      const newShapes = prevShapes.map(prevShape => {
        return prevShape.id === shape.id ? shape : prevShape
      })

      return _.isEqual(_.last(prevSavedShaped), newShapes)
        ? prevSavedShaped
        : [...prevSavedShaped, newShapes]
    })
  }, [])

  const removeShape = useCallback((shape: DrawableShape) => {
    setSelectedShape(prevSelectedShape =>
      prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
    )
    setSavedShapes(prevSavedShaped => {
      const prevShapes = _.last(prevSavedShaped) || []
      if (_.isEmpty(prevShapes)) return prevSavedShaped

      const newShapes = _.remove({ id: shape.id }, prevShapes)

      return _.isEqual(_.last(prevSavedShaped), newShapes)
        ? prevSavedShaped
        : [...prevSavedShaped, newShapes]
    })
  }, [])

  const selectTool = useCallback((tool: ShapeType | undefined) => {
    setActiveTool(tool)
    setSelectedShape(undefined)
  }, [])

  useEffect(() => {
    setShapes(() => {
      return _.last(savedShapes) ?? []
    })
  }, [savedShapes])

  return (
    <StyledApp>
      <Toolbox
        activeTool={activeTool}
        setSelectedShape={setSelectedShape}
        setActiveTool={selectTool}
        setShapes={setShapes}
        hasMoveToCancel={savedShapes.length > 0}
        cancelMove={cancelMove}
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
          saveShapes={saveShapes}
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
