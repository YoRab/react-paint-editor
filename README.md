# React Paint V0.11.0

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
    const onDataChanged = (data: StateData) => {
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
| `registerEvent` | `(event: "dataChanged", listener: (data: StateData) => void) => void` |  registerEvent is used to register a listener for special events triggered by react-paint. The only currently available event is `dataChanged` |
| `unregisterEvent` | `(event: "dataChanged", listener?: ((data: StateData) => void) \| undefined) => void` | unregisterEvent is used to unregister a listener previously registered. Omitting listener will result in unregistering every listeners for the the given event | 
| `resetCanvas` | `(shapes: DrawableShape[], clearHistory?: boolean) => Promise<void>` | reset canvas with the given shapes. use `[]` or `undefined` to clear the canvas. Set `false` to `clearHistory` to prevent history stack to be cleared | 
| `getCurrentImage` | `() => string \| undefined` | Returns a data URL containing the content of the current canvas as a PNG image, or undefined if an error occured |
| `getCurrentData` | `() => StateData` | Returns the current state of the canvas  |

#### Canvas

##### Parameters

| Parameter | Type | Description | Default value |
| :--- | :--- | :--- | :--- |
| `canvasProps` | `object` | **Required**. Set of properties coming from useReactPaint |  |
| `className` | `string` | *Optional*. Classname for canvas parent node | `undefined` |
| `style` | `CSSProperties` | *Optional*. css properties to inject to canvas parent node | `undefined` |
| `options` | `{canvasBackgroundColor?: string}` | *Optional*. Set of properties to use to customize canvas style | `{canvasBackgroundColor: 'white'}` |


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
#### `OptionalOptions`


## Changelog
https://github.com/YoRab/react-paint-editor/blob/main/Changelog.md

## License
<a href="https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt">MIT</a>


## Contributing