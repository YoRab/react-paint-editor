# React Paint

[![npm version](https://img.shields.io/npm/v/@yorab/react-paint)](https://www.npmjs.com/package/@yorab/react-paint)
[![License: MIT](https://img.shields.io/npm/l/@yorab/react-paint)](https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt)
[![Build and Test](https://github.com/YoRab/react-paint-editor/actions/workflows/build-and-test.yaml/badge.svg)](https://github.com/YoRab/react-paint-editor/actions/workflows/build-and-test.yaml)

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

## Modules

The library is made of two independent modules:

- **canvas**: the `Canvas` component and the `useReactPaint` hook, which holds the whole state and logic.
- **editor**: the `Editor` component (toolbar, settings bar, layers panel, context menu).

They only communicate through `useReactPaint`: `canvasProps` is given to `Canvas` and must be treated as opaque, `editorProps` is given to `Editor`, or to your own editor.

When you don't use `Editor`, it is removed from your bundle, even when importing from the package root. You can also import each module and its styles separately:

```tsx
import { Canvas, useReactPaint } from '@yorab/react-paint/canvas'
import '@yorab/react-paint/canvas/canvas.css'

import { Editor } from '@yorab/react-paint/editor'
import '@yorab/react-paint/editor/editor.css'
```

Tree-shaking applies to the ES modules build. The CommonJS (UMD) build, used with `require`, contains both modules.

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

### Custom Editor

`editorProps` is a public contract: `state` holds everything an editor needs to render (shapes, selection, active tool, history, zoom, hovered shape, context menu...) and `actions` holds the commands to act on the canvas. Set `editorRef` on the root element of your editor: it defines the area where interactions and keyboard shortcuts are active.

```tsx
import { Canvas, type EditorProps, useReactPaint } from '@yorab/react-paint/canvas'
import '@yorab/react-paint/canvas/canvas.css'

const MyEditor = ({ editorProps, children }: { editorProps: EditorProps; children: React.ReactNode }) => {
  const { state, actions, editorRef } = editorProps
  const selectedIds = state.selectedShapes.map(shape => shape.id)

  return (
    <div ref={editorRef}>
      {state.tools.map(tool => (
        <button key={tool.id} aria-pressed={state.activeTool.id === tool.id} onClick={() => actions.selectTool(tool.id)}>
          {tool.label ?? tool.type}
        </button>
      ))}
      <button disabled={!state.history.canUndo} onClick={actions.undo}>Undo</button>
      <button disabled={!selectedIds.length} onClick={() => actions.updateShapesStyle(selectedIds, 'strokeColor', 'red')}>Red</button>
      {children}
    </div>
  )
}

function MyPaintApp() {
  const { editorProps, canvasProps } = useReactPaint()

  return (
    <MyEditor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </MyEditor>
  )
}
```

To use the canvas alone, set `editorProps.editorRef` on an element wrapping `Canvas`.

### Upgrading from 0.x

Version 1 changes the shape of `editorProps` and moves some options. See the [migration guide](https://github.com/YoRab/react-paint-editor/blob/main/MIGRATION.md).

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
