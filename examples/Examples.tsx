import React, { useCallback, useRef, useState } from 'react'
import { DrawableShapeJson } from 'types/Shapes'
import App from '../src/components/App'
import { EXAMPLE_DEFAULT } from './fixture'

type MenuType = {
  selectedComponent: number
  setSelectedComponent: (componentIndex: number) => void
}

const MenuItems = [
  'Default',
  'Custom size and style',
  'Limited tools and customization',
  'From saved file',
  'Manual saves',
  'Auto saves',
  'Viewer mode'
]

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
  const widthRef = useRef<HTMLInputElement>(null)
  const heightRef = useRef<HTMLInputElement>(null)
  const canvasBackgroundColorRef = useRef<HTMLInputElement>(null)
  const [width, setWidth] = useState(500)
  const [height, setHeight] = useState(250)
  const [isShrinkable, setIsShrinkable] = useState(true)
  const [isGrowing, setisGrowing] = useState(false)
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('white')

  const updateSize = () => {
    widthRef.current && setWidth(+widthRef.current.value)
    heightRef.current && setHeight(+heightRef.current.value)
  }

  const updateStyle = () => {
    canvasBackgroundColorRef.current &&
      setCanvasBackgroundColor(canvasBackgroundColorRef.current.value)
  }

  switch (selectedComponent) {
    case 0:
    default:
      return <App />
    case 1:
      return (
        <>
          <div>
            <label>
              Canvas Width : <input type="number" defaultValue={width} ref={widthRef} />
            </label>
            <label>
              Canvas Height : <input type="number" defaultValue={height} ref={heightRef} />
            </label>
            <button onClick={updateSize}>Update size</button>
          </div>
          <div>
            <label>
              Can container shrink :
              <input
                type="checkbox"
                checked={isShrinkable}
                onChange={e => setIsShrinkable(e.currentTarget.checked)}
              />
            </label>
            <label>
              Can container grow :
              <input
                type="checkbox"
                checked={isGrowing}
                onChange={e => setisGrowing(e.currentTarget.checked)}
              />
            </label>
          </div>
          <div>
            <label>
              Canvas background color :
              <input
                type="color"
                defaultValue={canvasBackgroundColor}
                ref={canvasBackgroundColorRef}
              />
            </label>
            <button onClick={updateStyle}>Update style</button>
          </div>
          <App
            width={width}
            height={height}
            options={{
              canGrow: isGrowing,
              canShrink: isShrinkable,
              uiStyle: { canvasBackgroundColor: canvasBackgroundColor }
            }}
          />
        </>
      )
    case 2:
      return (
        <App
          options={{
            gridVisible: true,
            layersManipulation: false,
            withLoadAndSave: false,
            withExport: false,
            availableTools: ['circle', 'brush', undefined, 'not existing tool']
          }}
        />
      )
    case 3:
      return <App shapes={EXAMPLE_DEFAULT} />
    case 4:
      return <ManualSaveApp />
    case 5:
      return <AutoSaveApp />
    case 6:
      return <App shapes={EXAMPLE_DEFAULT} mode="viewer" />
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
