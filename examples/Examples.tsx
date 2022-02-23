import React, { useCallback, useRef, useState } from 'react'
import { DrawableShapeJson } from 'types/Shapes'
import App from '../src/components/App'

type MenuType = {
  selectedComponent: number
  setSelectedComponent: (componentIndex: number) => void
}

const MenuItems = ['Default', 'Mini', 'With default shapes', 'Manual saves', 'Auto saves']

const Menu = ({ selectedComponent, setSelectedComponent }: MenuType) => {
  return (
    <div className="menu">
      {MenuItems.map((item, index) => (
        <a
          key={index}
          className={selectedComponent === index ? 'selected' : ''}
          href="#"
          onClick={() => setSelectedComponent(index)}>
          {item}
        </a>
      ))}
    </div>
  )
}

type CurrentAppType = {
  selectedComponent: number
}

const ManualSaveApp = () => {
  const ref = useRef<{
    getCurrentImage: () => string | undefined
    getCurrentData: () => DrawableShapeJson[]
  }>()
  const [shapes, setShapes] = useState<DrawableShapeJson[] | undefined>(undefined)
  const [image, setImage] = useState<string | undefined>(undefined)

  const saveDatas = () => {
    const currentData = ref.current?.getCurrentData()
    const currentImage = ref.current?.getCurrentImage()
    setShapes(currentData)
    setImage(currentImage)
  }

  return (
    <>
      <App apiRef={ref} />
      <button onClick={saveDatas}>Save data</button>
      <App shapes={shapes} disabled />
      <img src={image} />
    </>
  )
}

const AutoSaveApp = () => {
  const ref = useRef<{
    getCurrentImage: () => string | undefined
    getCurrentData: () => DrawableShapeJson[]
  }>()
  const [shapes, setShapes] = useState<DrawableShapeJson[] | undefined>(undefined)
  const [image, setImage] = useState<string | undefined>(undefined)

  const refreshDatas = useCallback(() => {
    const currentData = ref.current?.getCurrentData()
    const currentImage = ref.current?.getCurrentImage()
    setShapes(currentData)
    setImage(currentImage)
  }, [])

  return (
    <>
      <App apiRef={ref} onDataChanged={refreshDatas} />
      <App shapes={shapes} disabled />
      <img src={image} />
    </>
  )
}

const CurrentApp = ({ selectedComponent }: CurrentAppType) => {
  switch (selectedComponent) {
    case 0:
    default:
      return <App />
    case 1:
      return <App width={300} height={200} />
    case 2:
      return (
        <App
          shapes={[
            {
              type: 'text',
              id: 'text4',
              x: 390,
              y: 502.125,
              value: ['Coucou'],
              fontSize: 79.39978025427719,
              width: 247,
              height: 79.39978025427719,
              translation: [-56, -6.699890127138588],
              scale: [1, 1],
              rotation: 0,
              style: {
                fillColor: 'transparent',
                strokeColor: 'black',
                lineWidth: 1,
                lineDash: 0,
                lineArrow: 0,
                pointsCount: 2,
                fontFamily: 'serif'
              }
            },
            {
              type: 'brush',
              id: 'brush3',
              points: [
                [
                  [676, 105.125],
                  [672, 105.125],
                  [652, 100.125],
                  [632, 98.125],
                  [618, 96.125],
                  [606, 96.125],
                  [591, 95.125],
                  [569, 95.125],
                  [553, 95.125],
                  [533, 95.125],
                  [516, 95.125],
                  [494, 100.125],
                  [483, 104.125],
                  [477, 112.125],
                  [470, 124.125],
                  [464, 140.125],
                  [459, 161.125],
                  [459, 182.125],
                  [462, 206.125],
                  [472, 229.125],
                  [487, 250.125],
                  [501, 271.125],
                  [514, 285.125],
                  [534, 313.125],
                  [549, 330.125],
                  [564, 345.125],
                  [576, 360.125],
                  [587, 374.125],
                  [595, 384.125],
                  [600, 397.125],
                  [601, 408.125],
                  [601, 419.125],
                  [599, 427.125],
                  [589, 437.125],
                  [564, 455.125],
                  [545, 462.125],
                  [520, 467.125],
                  [496, 469.125],
                  [473, 472.125],
                  [443, 472.125],
                  [415, 473.125],
                  [387, 468.125],
                  [362, 460.125],
                  [345, 455.125],
                  [334, 449.125],
                  [325, 443.125],
                  [313, 420.125],
                  [309, 404.125],
                  [300, 386.125],
                  [293, 376.125],
                  [288, 370.125],
                  [284, 367.125],
                  [284, 365.125]
                ]
              ],
              translation: [0, 0],
              scale: [1, 1],
              rotation: 0,
              style: {
                fillColor: 'transparent',
                strokeColor: 'blue',
                lineWidth: 5,
                lineDash: 2,
                lineArrow: 0,
                pointsCount: 2,
                fontFamily: 'serif'
              }
            },
            {
              type: 'circle',
              id: 'circle2',
              x: 638,
              y: 220.125,
              radius: 95,
              translation: [95, 95],
              scale: [1, 1],
              rotation: 0,
              style: {
                fillColor: 'green',
                strokeColor: 'green',
                lineWidth: 1,
                lineDash: 0,
                lineArrow: 0,
                pointsCount: 2,
                fontFamily: 'serif'
              }
            },
            {
              type: 'rect',
              id: 'rect1',
              x: 189,
              y: 77.125,
              width: 270,
              height: 201,
              translation: [-124, 7],
              scale: [1, 1],
              rotation: 0,
              style: {
                fillColor: 'red',
                strokeColor: 'red',
                lineWidth: 3,
                lineDash: 0,
                lineArrow: 0,
                pointsCount: 2,
                fontFamily: 'serif'
              }
            }
          ]}
        />
      )
    case 3:
      return <ManualSaveApp />
    case 4:
      return <AutoSaveApp />
  }
}

const Examples = () => {
  const [selectedComponent, setSelectedComponent] = useState(0)
  return (
    <div className="examples">
      <Menu selectedComponent={selectedComponent} setSelectedComponent={setSelectedComponent} />
      <div className="currentApp">
        <CurrentApp key={selectedComponent} selectedComponent={selectedComponent} />
      </div>
    </div>
  )
}

export default Examples
