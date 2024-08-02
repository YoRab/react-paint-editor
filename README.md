# React Paint V0.11.5

An open-source canvas-based library for React used for image annotation or as a digital whiteboard

## Features


## Quick start

```bash
npm i @yorab/react-paint
```
Note : react-paint needs <a href="https://www.npmjs.com/package/react">react</a> and <a href="https://www.npmjs.com/package/react-dom">react-dom</a> packages to work properly

## Usage

### Basic usage

```tsx
import { Canvas, Editor, useReactPaint } from '@yorab/react-paint'

const BasicUsage = () => {
  const { editorProps, canvasProps } = useReactPaint()

  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}
```

### Advanced usage

```tsx
import { useEffect, useState } from 'react'
import { Canvas, Editor, useReactPaint, type DrawableShape, type StateData } from '@yorab/react-paint'

const SHAPES_INIT = [
  {
    type: 'rect',
    x: 300,
    y: 300,
    width: 100,
    height: 200,
    rotation: 0,
    style: {
      fillColor: '#6a4e01',
      strokeColor: 'transparent',
      opacity: 100,
      lineWidth: 1,
      lineDash: 0,
      lineArrow: 0,
      pointsCount: 3,
      fontFamily: 'serif'
    }
  }
]

const AdvancedUsage = () => {
  const [shapes, setShapes] = useState<DrawableShape[] | undefined>(SHAPES_INIT) // keep shapes state for internal use

  const { editorProps, canvasProps, registerEvent, unregisterEvent } = useReactPaint({
    width: 1920,
    height: 1080,
    shapes,
    options: {
      canGrow: true,
      canShrink: true,
      brushAlgo: 'quadratic',
      clearCallback: 'defaultShapes'
    }
  })

  const editorOptions = {
    fontColor: '#2c1e69',
    fontHoverColor: '#0d0931'
  }

  const canvasOptions = {
    canvasBackgroundColor: '#ffffff'
  }

  useEffect(() => {
    const onDataChanged = (data: StateData, source: 'user' | 'remote') => {
      setShapes(data.shapes)
    }
    registerEvent('dataChanged', onDataChanged)
    
    return () => {
      unregisterEvent('dataChanged', onDataChanged)
    }
  }, [registerEvent, unregisterEvent])

  return (
    <Editor editorProps={editorProps} options={editorOptions}>
      <Canvas canvasProps={canvasProps} options={canvasOptions} />
    </Editor>
  )
}
```

### Other usages

you will find other usages in <a href="https://github.com/YoRab/react-paint-editor/tree/main/stories">stories</a>

### API

#### `useReactPaint`

##### Parameters

| Parameter | Type | Description | Default value |
| :--- | :--- | :--- | :--- |
| `width` | `number` | *Optional*. Canvas width in px | `1000` |
| `height` | `number` | *Optional*. Canvas height in px | `600` |
| `shapes` | [`DrawableShape[]`](####drawableshape) | *Optional*. Array of shapes used to init the canvas | `undefined` |
| `mode` | `editor\|viewer` | *Optional*. `editor` lets you interact with the canvas and editor. `viewer` hides the editor and makes the canvas read-only| `editor` |
| `disabled` | `boolean` | *Optional*. Global parameter used to prevent interaction with every element in the editor or canvas | `false` |
| `options` | [`OptionalOptions`](####optionaloptions) | *Optional*. Set of options to customize available features  | See [`OptionalOptions`]((####optionaloptions)) |


##### Returns

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `canvasProps` | `object` | Set of properties to forward to Canvas component |
| `editorProps` | `object` | Set of properties to forward to Editor component |
| `registerEvent` | `(event: "dataChanged", listener: (data: StateData,  source: 'user' \| 'remote') => void) => void` |  registerEvent is used to register a listener for special events triggered by react-paint. The only currently available event is `dataChanged`. `source` indicates the origin of the state update  |
| `unregisterEvent` | `(event: "dataChanged", listener?: ((data: StateData,  source: 'user' \| 'remote') => void) \| undefined) => void` | unregisterEvent is used to unregister a listener previously registered. Omitting listener will result in unregistering every listeners for the the given event | 
| `resetCanvas` | `(shapes: DrawableShape[], clearHistory?: boolean) => Promise<void>` | reset canvas with the given shapes. use `[]` or `undefined` to clear the canvas. Set `false` to `clearHistory` to prevent history stack to be cleared | 
| `getCurrentImage` | `() => string \| undefined` | Returns a data URL containing the content of the current canvas as a PNG image, or undefined if an error occured |
| `getCurrentData` | `() => StateData` | Returns the current state of the canvas  |

#### `OptionalOptions`

| Parameter | Type | Description | Default value |
| :--- | :--- | :--- | :--- |
| `layersManipulation` | `boolean` | *Optional*. Show panel to manipulate layers | `true` |
| `grid` | `number` | *Optional*. Size in px for grid cells. Set to 0 to hide grid | `0` |
| `canGrow` | `boolean` | *Optional*. Allow canvas to upscale and grow to fit container | `false` |
| `canShrink` | `boolean` | *Optional*. Allow canvas to downscale and shrink to fit container | `true` |
| `withExport` | `boolean` | *Optional*. Show button to manually export to PNG | `true` |
| `withLoadAndSave` | `boolean` | *Optional*.Show button to manually save or load data  | `true` |
| `withUploadPicture` | `boolean` | *Optional*. Show button to add picture shape stored in base64 | `true` |
| `withUrlPicture` | `boolean` | *Optional*.Show button to add picture shape with only the url stored. Need connectivity to be displayed | `false` |
| `withFrameSelection` | `boolean` | *Optional*.Enable frame selection. **Currently, does not support multi shapes selection** | `false` |
| `withSkeleton` | `boolean` | *Optional*. Display skeleton when hovering shape | `false` |
| `clearCallback` | `'empty' \| 'defaultShapes' \| (() => DrawableShape[])` | *Optional*. Set clear button behavior. `empty` clear all shapes, `defaultShapes` uses shapes given in props. It is also possible to set a function returning an array of shapes | `empty` |
| `brushAlgo` | `'simple' \| 'quadratic'` | *Optional*. Choose which algorithm to display brush shape. `simple` displays path as is, `quadratic` uses quadratic bézier curves  | `simple` |
| `isBrushShapeDoneOnMouseUp` | `boolean` | *Optional*. Choose whether drawing brush shape after releasing mouse should create a new shape or not | `true` |
| `canvasSelectionPadding` | `boolean` | *Optional*. Padding between shape and selection frame | `0` |
| `availableTools` | `CustomToolInput[]` | *Optional*. List of available tools. See CustomTool for more details | `` |




#### Canvas

##### Parameters

| Parameter | Type | Description | Default value |
| :--- | :--- | :--- | :--- |
| `canvasProps` | `object` | **Required**. Set of properties coming from useReactPaint |  |
| `className` | `string` | *Optional*. Classname for canvas parent node | `undefined` |
| `style` | `CSSProperties` | *Optional*. css properties to inject to canvas parent node | `undefined` |
| `options` | `{canvasBackgroundColor?: string; canvasSelectionColor?: string; canvasSelectionWidth?: number}` | *Optional*. Set of properties to use to customize canvas style | `{canvasBackgroundColor: 'white'; canvasSelectionColor: 'blue'; canvasSelectionWidth: 2}` |


#### Editor

##### Parameters

| Parameter | Type | Description | Default value |
| :--- | :--- | :--- | :--- |
| `editorProps` | `object` | **Required**. Set of properties coming from useReactPaint |  |
| `children` | `ReactNode` | **Required**. Need Canvas component to work properly |  |
| `className` | `string` | *Optional*. Classname for canvas parent node | `undefined` |
| `style` | `CSSProperties` | *Optional*. css properties to inject to canvas parent node | `undefined` |
| `options` | `{    toolbarBackgroundColor?: string;    dividerColor?: string;    fontRadius?: number;    fontDisabledColor?: string;    fontDisabledBackgroundColor?: string;    fontColor?: string;    fontBackgroundColor?: string;    fontSelectedColor?: string;    fontSelectedBackgroundColor?: string;    fontHoverColor?: string;    fontHoverBackgroundColor?: string;  }` | *Optional*. Set of properties to use to customize editor style | ` {  toolbarBackgroundColor: 'white',  dividerColor: '#36418129',  fontRadius: 8,  fontDisabledColor: '#3641812b',  fontDisabledBackgroundColor: 'transparent',  fontColor: '#364181',  fontBackgroundColor: 'transparent',  fontSelectedColor: 'white',  fontSelectedBackgroundColor: '#364181',  fontHoverColor: '#364181',  fontHoverBackgroundColor: '#afd8d8'}` |

### Types

#### `DrawableShape`
#### `StateData`

#### `CustomTool`

```
 type CustomTool = {
  id: string
  icon: string
  label: string
} & (
  | {
      type: 'brush'
      settings: ToolsSettingsType<'brush'>
    }
  | {
      type: 'circle'
      settings: ToolsSettingsType<'circle'>
    }
  | {
      type: 'ellipse'
      settings: ToolsSettingsType<'ellipse'>
    }
  | {
      type: 'rect'
      settings: ToolsSettingsType<'rect'>
    }
  | {
      type: 'square'
      settings: ToolsSettingsType<'square'>
    }
  | {
      type: 'line'
      settings: ToolsSettingsType<'line'>
    }
  | {
      type: 'polygon'
      settings: ToolsSettingsType<'polygon'>
    }
  | {
      type: 'curve'
      settings: ToolsSettingsType<'curve'>
    }
  | {
      type: 'text'
      settings: ToolsSettingsType<'text'>
    }
  | {
      type: 'picture'
      settings: ToolsSettingsType<'picture'>
    }
)

type SettingsOpacity = {
  opacity: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

type SettingsStrokeColor = {
  strokeColor: {
    values: string[]
    default: string
    hidden?: boolean
  }
}

type SettingsFillColor = {
  fillColor: {
    values: string[]
    default: string
    hidden?: boolean
  }
}

type SettingsLineWidth = {
  lineWidth: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

type SettingsLineDash = {
  lineDash: {
    values: number[]
    default: number
    hidden?: boolean
  }
}

type SettingsLineArrow = {
  lineArrow: {
    values: number[]
    default: number
    hidden?: boolean
  }
}

type SettingsFont = {
  fontFamily: {
    values: string[]
    default: string
    hidden?: boolean
  }
  fontBold: {
    values: boolean[]
    default: boolean
    hidden?: boolean
  }
  fontItalic: {
    values: boolean[]
    default: boolean
    hidden?: boolean
  }
}

type SettingsPointsCount = {
  pointsCount: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

type ToolsRectSettings = SettingsStrokeColor & SettingsFillColor & SettingsOpacity & SettingsLineWidth & SettingsLineDash

type ToolsSquareSettings = SettingsStrokeColor & SettingsFillColor & SettingsOpacity & SettingsLineWidth & SettingsLineDash

type ToolsCircleSettings = SettingsStrokeColor & SettingsFillColor & SettingsOpacity & SettingsLineWidth & SettingsLineDash

type ToolsEllipseSettings = SettingsStrokeColor & SettingsFillColor & SettingsOpacity & SettingsLineWidth & SettingsLineDash

type ToolsTextSettings = SettingsOpacity & SettingsStrokeColor & SettingsFont

type ToolsLineSettings = SettingsOpacity & SettingsStrokeColor & SettingsLineWidth & SettingsLineDash & SettingsLineArrow

type ToolsBrushSettings = SettingsOpacity & SettingsStrokeColor & SettingsLineWidth & SettingsLineDash

type ToolsPolygonSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsPointsCount

type ToolsCurveSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsPointsCount

type ToolsTriangleSettings = SettingsStrokeColor & SettingsFillColor & SettingsOpacity & SettingsLineWidth & SettingsLineDash

type ToolsPictureSettings = SettingsOpacity

type ToolsSettingsType<T extends ShapeType> = T extends 'rect'
  ? ToolsRectSettings
  : T extends 'square'
    ? ToolsSquareSettings
    : T extends 'circle'
      ? ToolsCircleSettings
      : T extends 'ellipse'
        ? ToolsEllipseSettings
        : T extends 'text'
          ? ToolsTextSettings
          : T extends 'line'
            ? ToolsLineSettings
            : T extends 'brush'
              ? ToolsBrushSettings
              : T extends 'polygon'
                ? ToolsPolygonSettings
                : T extends 'curve'
                  ? ToolsCurveSettings
                  : T extends 'triangle'
                    ? ToolsTriangleSettings
                    : T extends 'picture'
                      ? ToolsPictureSettings
                      : never

```

## Changelog
https://github.com/YoRab/react-paint-editor/blob/main/Changelog.md

## License
<a href="https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt">MIT</a>


## Contributing
