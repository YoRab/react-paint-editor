import type { Meta, StoryObj } from '@storybook/react'
import Customizer from './Customizer'

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  title: 'Main/Customizer',
  component: Customizer,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered'
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs']
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
} satisfies Meta<typeof Customizer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: ` const widthRef = useRef<HTMLInputElement>(null)
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
  const [quadraticBrush, setQuadraticBrush] = useState(false)
  const [isShrinkable, setIsShrinkable] = useState(true)
  const [isGrowing, setisGrowing] = useState(false)
  const [withSkeleton, setWithSkeleton] = useState(false)
  const [toolbarBackgroundColor, settoolbarBackgroundColor] = useState<string>('#ffffff')
  const [dividerColor, setdividerColor] = useState<string>('#36418129')
  const [fontRadius, setfontRadius] = useState<number>(8)
  const [fontDisabledColor, setfontDisabledColor] = useState<string>('#3641812b')
  const [fontDisabledBackgroundColor, setfontDisabledBackgroundColor] = useState<string>('transparent')
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
    toolbarBackgroundColorRef.current && settoolbarBackgroundColor(toolbarBackgroundColorRef.current.value)
    dividerColorRef.current && setdividerColor(dividerColorRef.current.value)
    fontRadiusRef.current && setfontRadius(+fontRadiusRef.current.value)
    fontDisabledColorRef.current && setfontDisabledColor(fontDisabledColorRef.current.value)
    fontDisabledBackgroundColorRef.current && setfontDisabledBackgroundColor(fontDisabledBackgroundColorRef.current.value)
    fontColorRef.current && setfontColor(fontColorRef.current.value)
    fontBackgroundColorRef.current && setfontBackgroundColor(fontBackgroundColorRef.current.value)
    fontSelectedBackgroundColorRef.current && setfontSelectedColor(fontSelectedBackgroundColorRef.current.value)
    fontSelectedColorRef.current && setfontSelectedBackgroundColor(fontSelectedColorRef.current.value)
    fontHoverColorRef.current && setfontHoverColor(fontHoverColorRef.current.value)
    fontHoverBackgroundColorRef.current && setfontHoverBackgroundColor(fontHoverBackgroundColorRef.current.value)
    canvasBackgroundColorRef.current && setCanvasBackgroundColor(canvasBackgroundColorRef.current.value)
    canvasSelectionColorRef.current && setcanvasSelectionColor(canvasSelectionColorRef.current.value)
    canvasSelectionWidthRef.current && setcanvasSelectionWidth(+canvasSelectionWidthRef.current.value)
    canvasSelectionPaddingRef.current && setcanvasSelectionPadding(+canvasSelectionPaddingRef.current.value)
  }

  const { editorProps, canvasProps } = useReactPaint({
    width,
    height,
    options: {
      canGrow: isGrowing,
      canShrink: isShrinkable,
      withSkeleton,
      brushAlgo: quadraticBrush ? 'quadratic' : 'simple',
      canvasSelectionPadding
    }
  })

  const editorOptions = {
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
    fontHoverBackgroundColor
  }

  const canvasOptions = {
    canvasBackgroundColor,
    canvasSelectionColor,
    canvasSelectionWidth
  }

  return (
    <>
      <div>
        <label>
          Canvas Width : <input type='number' defaultValue={width} ref={widthRef} />
        </label>
        <label>
          Canvas Height : <input type='number' defaultValue={height} ref={heightRef} />
        </label>
        <button type='button' onClick={updateSize}>
          Update size
        </button>
      </div>
      <div>
        <label>
          Can container shrink :
          <input type='checkbox' checked={isShrinkable} onChange={e => setIsShrinkable(e.currentTarget.checked)} />
        </label>
        <label>
          Can container grow :
          <input type='checkbox' checked={isGrowing} onChange={e => setisGrowing(e.currentTarget.checked)} />
        </label>
      </div>
      <div>
        <label>
          Use quadratic brush :
          <input type='checkbox' checked={quadraticBrush} onChange={e => setQuadraticBrush(e.currentTarget.checked)} />
        </label>
        <label>
          With skeleton :
          <input type='checkbox' checked={withSkeleton} onChange={e => setWithSkeleton(e.currentTarget.checked)} />
        </label>
      </div>
      <div>
        <label>
          Toolbar background color :
          <input type='color' defaultValue={toolbarBackgroundColor} ref={toolbarBackgroundColorRef} />
        </label>
        <label>
          Canvas background color :
          <input type='color' defaultValue={canvasBackgroundColor} ref={canvasBackgroundColorRef} />
        </label>
        <label>
          Canvas selection color :
          <input type='color' defaultValue={canvasSelectionColor} ref={canvasSelectionColorRef} />
        </label>
        <label>
          Canvas selection width :
          <input type='number' defaultValue={canvasSelectionWidth} ref={canvasSelectionWidthRef} />
        </label>
        <label>
          Canvas selection padding :
          <input type='number' defaultValue={canvasSelectionPadding} ref={canvasSelectionPaddingRef} />
        </label>
        <label>
          Divider color :
          <input type='color' defaultValue={dividerColor} ref={dividerColorRef} />
        </label>
        <label>
          Button radius :
          <input type='number' defaultValue={fontRadius} ref={fontRadiusRef} />
        </label>
        <label>
          Font color :
          <input type='color' defaultValue={fontColor} ref={fontColorRef} />
        </label>
        <label>
          Font BG color :
          <input type='color' defaultValue={fontBackgroundColor} ref={fontBackgroundColorRef} />
        </label>
        <label>
          Font disabledcolor :
          <input type='color' defaultValue={fontDisabledColor} ref={fontDisabledColorRef} />
        </label>
        <label>
          Font disabled BG color :
          <input type='color' defaultValue={fontDisabledBackgroundColor} ref={fontDisabledBackgroundColorRef} />
        </label>
        <label>
          Font selected color :
          <input type='color' defaultValue={fontSelectedColor} ref={fontSelectedColorRef} />
        </label>
        <label>
          Font selected BG color :
          <input type='color' defaultValue={fontSelectedBackgroundColor} ref={fontSelectedBackgroundColorRef} />
        </label>
        <label>
          Font hover color :
          <input type='color' defaultValue={fontHoverColor} ref={fontHoverColorRef} />
        </label>
        <label>
          Font hover BG color :
          <input type='color' defaultValue={fontHoverBackgroundColor} ref={fontHoverBackgroundColorRef} />
        </label>
        <button type='button' onClick={updateStyle}>
          Update style
        </button>
      </div>
      <Editor editorProps={editorProps} options={editorOptions}>
        <Canvas canvasProps={canvasProps} options={canvasOptions} />
      </Editor>
    </>
  )`,
        language: 'tsx'
      }
    }
  }
}
