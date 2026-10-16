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

They only communicate through the handle returned by `useReactPaint`, given to `Canvas` and `Editor`, or to your own editor.

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
  const paint = useReactPaint()

  return (
    <Editor paint={paint}>
      <Canvas paint={paint} />
    </Editor>
  )
}
```

`paint` keeps the same identity for the whole life of the component, and the component calling `useReactPaint` does not render again when the drawing changes.

### Advanced Usage

```tsx
import { useEffect, useState } from 'react'
import { Canvas, Editor, useReactPaint, type DrawableShape } from '@yorab/react-paint'
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

  const paint = useReactPaint({
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

  // registerEvent returns the function that unregisters the listener
  useEffect(() => paint.registerEvent('dataChanged', data => setShapes(data.shapes)), [paint])

  return (
    <Editor paint={paint} options={editorOptions}>
      <Canvas paint={paint} options={canvasOptions} />
    </Editor>
  )
}
```

Options are compared by value: they can be written inline.

### Reading the state

`usePaintState(paint, selector?, isEqual?)` reads the state during a render, and renders the component again only when the selected value changes. Without selector, it returns the whole `EditorState`. In an event handler, read it with `paint.getState()`.

```tsx
import { shallowEqual, usePaintState } from '@yorab/react-paint'

const canUndo = usePaintState(paint, state => state.history.canUndo)
const zoom = usePaintState(paint, state => state.view.zoom)
// a selector building an object or an array needs an equality function
const { shapes, selectedShapes } = usePaintState(paint, state => ({ shapes: state.shapes, selectedShapes: state.selectedShapes }), shallowEqual)
```

The handle also gives `actions` (the commands), `registerEvent` / `unregisterEvent`, `resetCanvas`, `getCurrentImage` and `getCurrentData`.

### Custom Editor

The handle is a public contract: `usePaintState` gives everything an editor needs to render (shapes, selection, active tool, history, zoom, hovered shape, context menu...) and `actions` holds the commands to act on the canvas. Set `paint.editorRef` on the root element of your editor: it defines the area where interactions and keyboard shortcuts are active.

Under a `PaintProvider`, any component can get the handle with `usePaint`: each part of the editor reads only what it shows.

```tsx
import { Canvas, PaintProvider, type ReactPaint, shallowEqual, usePaint, usePaintState, useReactPaint } from '@yorab/react-paint/canvas'
import '@yorab/react-paint/canvas/canvas.css'

const MyToolbar = () => {
  const paint = usePaint()
  const { activeTool, tools, canUndo } = usePaintState(
    paint,
    state => ({ activeTool: state.activeTool, tools: state.tools, canUndo: state.history.canUndo }),
    shallowEqual
  )
  const selectedIds = usePaintState(paint, state => state.selectedShapeIds)

  return (
    <div>
      {tools.map(tool => (
        <button key={tool.id} aria-pressed={activeTool.id === tool.id} onClick={() => paint.actions.selectTool(tool.id)}>
          {tool.label ?? tool.type}
        </button>
      ))}
      <button disabled={!canUndo} onClick={paint.actions.undo}>Undo</button>
      <button disabled={!selectedIds.length} onClick={() => paint.actions.updateShapesStyle(selectedIds, 'strokeColor', 'red')}>Red</button>
    </div>
  )
}

const MyEditor = ({ paint, children }: { paint: ReactPaint; children: React.ReactNode }) => (
  <PaintProvider paint={paint}>
    <div ref={paint.editorRef}>
      <MyToolbar />
      {children}
    </div>
  </PaintProvider>
)

function MyPaintApp() {
  const paint = useReactPaint()

  return (
    <MyEditor paint={paint}>
      <Canvas paint={paint} />
    </MyEditor>
  )
}
```

To use the canvas alone, set `paint.editorRef` on an element wrapping `Canvas`. The `Editor` component provides the handle to its children too, and a `PaintProvider` lets you place parts of your interface, like a toolbar, outside of the editor.

### Picture annotation

To lay a picture under the canvas, give it the style returned by `useAnnotationsStyle(paint)`: it follows the zoom and the moves of the view.

### Performance

- Select precise slices of the state: a component reading `state.history.canUndo` does not render while a shape is dragged, one reading `state.shapes` does.
- When a selector builds an object or an array, give `shallowEqual` (or your own equality function) as third argument, otherwise the component renders on each change of the state.
- Read `state.interaction` (hovered shape, selection frame, modifier keys) only when you need it: it changes on each move of the pointer.
- In event handlers, read the state with `paint.getState()` instead of subscribing to it.

### Upgrading from 0.x

Version 1 replaces `editorProps` and `canvasProps` with a single handle and moves some options. See the [migration guide](https://github.com/YoRab/react-paint-editor/blob/main/MIGRATION.md).

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
