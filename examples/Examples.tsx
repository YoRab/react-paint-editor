import React, { useRef, useState } from 'react'
import { DrawableShapeJson, ExportDataType } from 'types/Shapes'
import App from '../src/components/App'
import { EXAMPLE_DEFAULT } from './fixture'

type MenuType = {
  selectedComponent: number
  setSelectedComponent: (componentIndex: number) => void
}

const MenuItems = [
  'Default',
  'Custom size and style',
  'Limited tools and settings',
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
    getCurrentData: () => ExportDataType
  }>()
  const [shapes, setShapes] = useState<DrawableShapeJson[] | undefined>(undefined)
  const [image, setImage] = useState<string | undefined>(undefined)

  const saveDatas = () => {
    const currentData = ref.current?.getCurrentData()
    const currentImage = ref.current?.getCurrentImage()
    currentData && setShapes(currentData.shapes)
    currentImage && setImage(currentImage)
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
    getCurrentData: () => ExportDataType
  }>()
  const [shapes, setShapes] = useState<DrawableShapeJson[] | undefined>(undefined)
  const [image, setImage] = useState<string | undefined>(undefined)

  const refreshDatas = () => {
    const currentData = ref.current?.getCurrentData()
    const currentImage = ref.current?.getCurrentImage()
    currentData && setShapes(currentData.shapes)
    currentImage && setImage(currentImage)
  }

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
  const toolbarBackgroundColorRef = useRef<HTMLInputElement>(null)
  const dividerColorRef = useRef<HTMLInputElement>(null)
  const fontRadiusRef = useRef<HTMLInputElement>(null)
  const fontDisabledColorRef = useRef<HTMLInputElement>(null)
  const fontDisabledBackgroundColorRef = useRef<HTMLInputElement>(null)
  const fontColorRef = useRef<HTMLInputElement>(null)
  const fontBackgroundColorRef = useRef<HTMLInputElement>(null)
  const fontSelectedColorRef = useRef<HTMLInputElement>(null)
  const fontSelectedBackgroundColorRef = useRef<HTMLInputElement>(null)
  const fontHoverColorRef = useRef<HTMLInputElement>(null)
  const fontHoverBackgroundColorRef = useRef<HTMLInputElement>(null)
  const canvasBackgroundColorRef = useRef<HTMLInputElement>(null)
  const canvasSelectionColorRef = useRef<HTMLInputElement>(null)
  const canvasSelectionWidthRef = useRef<HTMLInputElement>(null)
  const canvasSelectionPaddingRef = useRef<HTMLInputElement>(null)

  const [width, setWidth] = useState(500)
  const [height, setHeight] = useState(250)
  const [isShrinkable, setIsShrinkable] = useState(true)
  const [isGrowing, setisGrowing] = useState(false)
  const [toolbarBackgroundColor, settoolbarBackgroundColor] = useState<string>('#ffffff')
  const [dividerColor, setdividerColor] = useState<string>('#36418129')
  const [fontRadius, setfontRadius] = useState<number>(8)
  const [fontDisabledColor, setfontDisabledColor] = useState<string>('#3641812b')
  const [fontDisabledBackgroundColor, setfontDisabledBackgroundColor] =
    useState<string>('transparent')
  const [fontColor, setfontColor] = useState<string>('#364181')
  const [fontBackgroundColor, setfontBackgroundColor] = useState<string>('transparent')
  const [fontSelectedColor, setfontSelectedColor] = useState<string>('#ffffff')
  const [fontSelectedBackgroundColor, setfontSelectedBackgroundColor] = useState<string>('#364181')
  const [fontHoverColor, setfontHoverColor] = useState<string>('#364181')
  const [fontHoverBackgroundColor, setfontHoverBackgroundColor] = useState<string>('#afd8d8')
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('#ffffff')
  const [canvasSelectionColor, setcanvasSelectionColor] = useState<string>('#0000FF')
  const [canvasSelectionWidth, setcanvasSelectionWidth] = useState<number>(2)
  const [canvasSelectionPadding, setcanvasSelectionPadding] = useState<number>(0)

  const updateSize = () => {
    widthRef.current && setWidth(+widthRef.current.value)
    heightRef.current && setHeight(+heightRef.current.value)
  }

  const updateStyle = () => {
    toolbarBackgroundColorRef.current &&
      settoolbarBackgroundColor(toolbarBackgroundColorRef.current.value)
    dividerColorRef.current && setdividerColor(dividerColorRef.current.value)
    fontRadiusRef.current && setfontRadius(+fontRadiusRef.current.value)
    fontDisabledColorRef.current && setfontDisabledColor(fontDisabledColorRef.current.value)
    fontDisabledBackgroundColorRef.current &&
      setfontDisabledBackgroundColor(fontDisabledBackgroundColorRef.current.value)
    fontColorRef.current && setfontColor(fontColorRef.current.value)
    fontBackgroundColorRef.current && setfontBackgroundColor(fontBackgroundColorRef.current.value)
    fontSelectedBackgroundColorRef.current &&
      setfontSelectedColor(fontSelectedBackgroundColorRef.current.value)
    fontSelectedColorRef.current &&
      setfontSelectedBackgroundColor(fontSelectedColorRef.current.value)
    fontHoverColorRef.current && setfontHoverColor(fontHoverColorRef.current.value)
    fontHoverBackgroundColorRef.current &&
      setfontHoverBackgroundColor(fontHoverBackgroundColorRef.current.value)
    canvasBackgroundColorRef.current &&
      setCanvasBackgroundColor(canvasBackgroundColorRef.current.value)
    canvasSelectionColorRef.current &&
      setcanvasSelectionColor(canvasSelectionColorRef.current.value)
    canvasSelectionWidthRef.current &&
      setcanvasSelectionWidth(+canvasSelectionWidthRef.current.value)
    canvasSelectionPaddingRef.current &&
      setcanvasSelectionPadding(+canvasSelectionPaddingRef.current.value)
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
              Toolbar background color :
              <input
                type="color"
                defaultValue={toolbarBackgroundColor}
                ref={toolbarBackgroundColorRef}
              />
            </label>
            <label>
              Canvas background color :
              <input
                type="color"
                defaultValue={canvasBackgroundColor}
                ref={canvasBackgroundColorRef}
              />
            </label>
            <label>
              Canvas selection color :
              <input
                type="color"
                defaultValue={canvasSelectionColor}
                ref={canvasSelectionColorRef}
              />
            </label>
            <label>
              Canvas selection width :
              <input
                type="number"
                defaultValue={canvasSelectionWidth}
                ref={canvasSelectionWidthRef}
              />
            </label>
            <label>
              Canvas selection padding :
              <input
                type="number"
                defaultValue={canvasSelectionPadding}
                ref={canvasSelectionPaddingRef}
              />
            </label>
            <label>
              Divider color :
              <input type="color" defaultValue={dividerColor} ref={dividerColorRef} />
            </label>
            <label>
              Button radius :
              <input type="number" defaultValue={fontRadius} ref={fontRadiusRef} />
            </label>
            <label>
              Font color :
              <input type="color" defaultValue={fontColor} ref={fontColorRef} />
            </label>
            <label>
              Font BG color :
              <input type="color" defaultValue={fontBackgroundColor} ref={fontBackgroundColorRef} />
            </label>
            <label>
              Font disabledcolor :
              <input type="color" defaultValue={fontDisabledColor} ref={fontDisabledColorRef} />
            </label>
            <label>
              Font disabled BG color :
              <input
                type="color"
                defaultValue={fontDisabledBackgroundColor}
                ref={fontDisabledBackgroundColorRef}
              />
            </label>
            <label>
              Font selected color :
              <input type="color" defaultValue={fontSelectedColor} ref={fontSelectedColorRef} />
            </label>
            <label>
              Font selected BG color :
              <input
                type="color"
                defaultValue={fontSelectedBackgroundColor}
                ref={fontSelectedBackgroundColorRef}
              />
            </label>
            <label>
              Font hover color :
              <input type="color" defaultValue={fontHoverColor} ref={fontHoverColorRef} />
            </label>
            <label>
              Font hover BG color :
              <input
                type="color"
                defaultValue={fontHoverBackgroundColor}
                ref={fontHoverBackgroundColorRef}
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
              uiStyle: {
                toolbarBackgroundColor,
                dividerColor,
                fontRadius,
                fontDisabledColor,
                fontDisabledBackgroundColor,
                fontColor,
                fontBackgroundColor,
                fontSelectedColor,
                fontSelectedBackgroundColor,
                fontHoverColor,
                fontHoverBackgroundColor,
                canvasBackgroundColor,
                canvasSelectionColor,
                canvasSelectionWidth,
                canvasSelectionPadding
              }
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
            withLoadAndSave: true,
            withExport: true,
            withUrlPicture: true,
            withUploadPicture: false,
            availableTools: [
              'circle',
              'brush',
              undefined,
              'not existing tool',
              {
                id: 'brush1',
                label: 'test with not existing type; should not appear',
                type: 'sgg'
              },
              {
                id: 'brush2',
                label: 'test without any type should not appear'
              },
              {
                id: 'brush3',
                label: 'classic brush',
                type: 'brush',
                settings: {
                  lineWidth: {
                    min: 2,
                    max: 20,
                    step: 2,
                    default: 4
                  },
                  strokeColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: '#002E4D'
                  },
                  opacity: {
                    min: 0,
                    max: 100,
                    step: 5,
                    default: 100
                  }
                }
              },
              {
                id: 'line',
                label: 'classic line',
                type: 'line',
                settings: {
                  lineWidth: {
                    min: 2,
                    max: 20,
                    step: 2,
                    default: 4
                  },
                  lineArrow: {
                    values: [0, 1, 2, 3],
                    default: 1
                  },
                  strokeColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: '#002E4D'
                  },
                  opacity: {
                    min: 0,
                    max: 100,
                    step: 5,
                    default: 100
                  }
                }
              },
              {
                id: 'rectangle',
                label: 'classic rectangle',
                type: 'rect',
                settings: {
                  lineWidth: {
                    min: 2,
                    max: 20,
                    step: 2,
                    default: 4
                  },
                  strokeColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: '#002E4D'
                  },
                  fillColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: 'transparent'
                  },
                  opacity: {
                    min: 0,
                    max: 100,
                    step: 5,
                    default: 100
                  }
                }
              },
              {
                id: 'ellipse',
                label: 'classic ellipse',
                type: 'ellipse',
                settings: {
                  lineWidth: {
                    min: 2,
                    max: 20,
                    step: 2,
                    default: 4
                  },

                  strokeColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: '#002E4D'
                  },
                  fillColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: 'transparent'
                  },
                  opacity: {
                    min: 0,
                    max: 100,
                    step: 5,
                    default: 100
                  }
                }
              },
              {
                id: 'text',
                label: 'classic text',
                type: 'text',
                settings: {
                  fontFamily: {
                    values: ['ProximaNova', 'Sabon', 'Fira Mono'],
                    default: 'ProximaNova'
                  },
                  strokeColor: {
                    values: [
                      'transparent',
                      '#FFFFFF',
                      '#002E4D',
                      '#21BFEF',
                      '#FFA800',
                      '#135BEB',
                      '#FF5C93',
                      '#FF6D24',
                      '#00C79F',
                      '#9580FF',
                      '#55779E',
                      '#000000'
                    ],
                    default: '#002E4D'
                  },

                  opacity: {
                    min: 0,
                    max: 100,
                    step: 5,
                    default: 100
                  }
                }
              }
            ]
          }}
        />
      )
    case 3:
      return (
        <App
          shapes={EXAMPLE_DEFAULT}
          options={{
            clearCallback: 'defaultShapes'
          }}
        />
      )
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
