# React Paint

An open-source canvas-based library for React used for image annotation or as a digital whiteboard.

## Features

- **Rich Drawing Tools** - Brush, shapes (rectangles, circles, ellipses, polygons, curves), lines, text, and picture support
- **Interactive Canvas** - Full support for zoom, pan, pinch gestures, and infinite or fixed-size canvases
- **Shape Manipulation** - Select, move, resize, rotate, and transform shapes with intuitive controls
- **Customizable Styling** - Control colors, line widths, opacity, line styles, arrows, and fonts
- **Layer Management** - Built-in layer manipulation panel for organizing your drawings
- **Export & Import** - Export to PNG images or save/load your work as JSON data
- **Event System** - Listen to data changes and integrate with your application state
- **Flexible Configuration** - Extensive options to customize behavior and appearance
- **TypeScript Support** - Fully typed for better developer experience

## Quick Start

### Installation

```bash
npm install @yorab/react-paint
```

**Note:** React Paint requires `react` and `react-dom` (version 18.x) as peer dependencies.

### Import Styles

Don't forget to import the CSS file in your application:

```tsx
import '@yorab/react-paint/react-paint.css'
```

## Usage

### Basic Usage

```tsx
import { Canvas, Editor, useReactPaint } from '@yorab/react-paint'
import '@yorab/react-paint/react-paint.css'

function MyPaintApp() {
  const { editorProps, canvasProps } = useReactPaint()

  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}
```

### Advanced Usage

```tsx
import { useEffect, useState } from 'react'
import { Canvas, Editor, useReactPaint, type DrawableShape, type StateData } from '@yorab/react-paint'
import '@yorab/react-paint/react-paint.css'

const SHAPES_INIT: DrawableShape[] = [
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
      closedPoints: 1,
      fontFamily: 'serif'
    }
  }
]

function AdvancedPaintApp() {
  const [shapes, setShapes] = useState<DrawableShape[] | undefined>(SHAPES_INIT)

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

## Documentation

For complete documentation, API reference, examples, and interactive demos, visit our **Storybook**:

**[📚 View Storybook Documentation](https://yorab.github.io/react-paint-editor/)**

The Storybook includes:
- Getting started guide
- Complete API reference
- Interactive playground
- Usage examples
- Configuration options

## Resources

- [Changelog](https://github.com/YoRab/react-paint-editor/blob/main/Changelog.md)
- [License](https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt) (MIT)
- [GitHub Repository](https://github.com/YoRab/react-paint-editor)

## Contributing
