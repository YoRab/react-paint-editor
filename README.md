# React Paint V0.11.0

An open-source canvas-based library for React used for image annotation or as a digital whiteboard

## Features

- Editor customization



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

### API

## Changelog
https://github.com/YoRab/react-paint-editor/blob/main/Changelog.md

## License
<a href="https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt">MIT</a>


## Contributing