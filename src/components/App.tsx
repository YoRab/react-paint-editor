import _ from 'lodash'
import React, { useCallback, useState } from 'react'
import { Marker } from '../types/Markers'
import { ShapeDrawable } from '../types/Shapes'
import Drawer from './canvas/Drawer'
import Layouts from './toolbox/Layouts'
import Toolbox from './toolbox/Toolbox'

const App = () => {
  const [activeMarker, setActiveMarker] = useState<Marker>({ type: 'default' })
  const [selectedShape, setSelectedShape] = useState<ShapeDrawable | undefined>(undefined)
  const [shapes, setShapes] = useState<ShapeDrawable[]>([
    {
      type: 'line',
      id: _.uniqueId(),
      points: [
        [20, 30],
        [50, 100]
      ],
      translation: [0, 0],
      rotation: 0
    },
    {
      type: 'circle',
      id: _.uniqueId(),
      x: 100,
      y: 100,
      radius: 50,
      translation: [0, 0],
      rotation: Math.PI / 4
    },
    {
      type: 'ellipse',
      id: _.uniqueId(),
      x: 400,
      y: 400,
      radiusX: 50,
      radiusY: 100,
      translation: [0, 0],
      rotation: Math.PI / 4
    },
    {
      type: 'rect',
      id: _.uniqueId(),
      x: 100,
      y: 250,
      width: 50,
      height: 100,
      translation: [0, 0],
      rotation: Math.PI / 8
    },

    {
      type: 'rect',
      id: _.uniqueId(),
      x: 100,
      y: 250,
      width: 50,
      height: 100,
      translation: [0, 0],
      rotation: Math.PI / 2
    },
    {
      type: 'polygon',
      id: _.uniqueId(),
      points: [
        [40, 20],
        [100, 100],
        [150, 250],
        [20, 40],
        [150, 200]
      ],
      translation: [0, 0],
      rotation: 0
    },
    {
      type: 'polygon',
      id: _.uniqueId(),
      points: [
        [40, 20],
        [80, 20],
        [120, 40],
        [80, 80]
      ],
      translation: [0, 0],
      rotation: 0
    }
  ])
  // const toggleLine = useCallback((marker: { type: string }) => {
  //   setActiveMarker(previousActiveMarker =>
  //     previousActiveMarker === undefined ? marker : undefined
  //   )
  // }, [])

  return (
    <>
      {/* <Toolbox onClick={toggleLine} /> */}
      <Drawer
        activeMarker={activeMarker}
        shapes={shapes}
        setShapes={setShapes}
        selectedShape={selectedShape}
        setSelectedShape={setSelectedShape}
      />
      <Layouts
        shapes={shapes}
        setMarkers={setShapes}
        selectedShape={selectedShape}
        setSelectedShape={setSelectedShape}
      />
    </>
  )
}

export default App
