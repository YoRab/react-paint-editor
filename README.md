# React Paint

[![npm version](https://img.shields.io/npm/v/@yorab/react-paint)](https://www.npmjs.com/package/@yorab/react-paint)
[![License: MIT](https://img.shields.io/npm/l/@yorab/react-paint)](https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt)
[![Build and Test](https://github.com/YoRab/react-paint-editor/actions/workflows/build-and-test.yaml/badge.svg)](https://github.com/YoRab/react-paint-editor/actions/workflows/build-and-test.yaml)
[![Socket Badge](https://socket.dev/api/badge/npm/package/@yorab/react-paint)](https://socket.dev/npm/package/@yorab/react-paint)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

An open-source canvas-based library for React used for image annotation or as a digital whiteboard.

![The React Paint editor: a drawing of a tree on a hill, with the trunk selected](https://raw.githubusercontent.com/YoRab/react-paint-editor/main/docs/screenshot.png)

**[Live demo and documentation](https://yorab.github.io/react-paint-editor/)**

## Features

- **Rich Drawing Tools** - Brush, shapes (rectangles, circles, ellipses, polygons, curves), lines, text, and picture support
- **Interactive Canvas** - Full support for zoom, pan, pinch gestures, and infinite or fixed-size canvases, scaled to their container or filling it
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

**Note:** React Paint requires `react` and `react-dom` (version 18 or 19) as peer dependencies.

### Import Styles

When you use the `Editor`, don't forget to import the CSS file in your application:

```tsx
import '@yorab/react-paint/react-paint.css'
```

The `Canvas` needs no stylesheet: its styles are inline, see [Customizing the canvas styles](#customizing-the-canvas-styles).

## Modules

The library is made of two independent modules:

- **canvas**: the `Canvas` component and the `useReactPaint` hook, which holds the whole state and logic.
- **editor**: the `Editor` component (toolbar, settings bar, layers panel, context menu).

They only communicate through the handle returned by `useReactPaint`, given to `Canvas` and `Editor`, or to your own editor.

When you don't use `Editor`, it is removed from your bundle, even when importing from the package root. You can also import each module separately, only the editor has a stylesheet:

```tsx
import { Canvas, useReactPaint } from '@yorab/react-paint/canvas'

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
      resize: 'scale',
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

### Size of the canvas

The `resize` option sets how the canvas follows its container. The first four values keep its logical size, `width`×`height`, and show the whole drawing, its width following the container within their bounds:

| `resize` | Width of the canvas on the page |
| --- | --- |
| `'scaleDown'` (default) | the width of the container, at most `width` pixels |
| `'scale'` | the width of the container |
| `'scaleUp'` | the width of the container, at least `width` pixels |
| `'none'` | always `width` pixels |

With `resize: 'extend'`, the canvas fills its container at the scale 1 and its visible area follows the container, redrawn in the same frame: a whiteboard needs no ResizeObserver. The container must have a height. `width` and `height` stay the size of the drawing:

- with `size: 'infinite'`, they are the area exported by the `defaultView` of `exportPicture` and the size given in the exported data. The top left corner of the view stays still when the container is resized.
- with `size: 'fixed'`, they are the page: it is centered with a mask around it when the container is larger, and the view is kept inside it otherwise.

```tsx
const paint = useReactPaint({ options: { size: 'infinite', resize: 'extend', canZoom: 'always' } })

return (
  <div style={{ height: '100vh' }}>
    <Editor paint={paint}>
      <Canvas paint={paint} />
    </Editor>
  </div>
)
```

`--react-paint-app-canvaswidth` and `--react-paint-app-row-aspectratio` have no effect with `extend`. A page larger than its container is scrolled with the wheel when `canZoom` is `'always'`, and in edit mode by dragging with the space key or the wheel button pressed.

### Reading the state

`usePaintState(paint, selector?, isEqual?)` reads the state during a render, and renders the component again only when the selected value changes. Without selector, it returns the whole `EditorState`. In an event handler, read it with `paint.getState()`.

```tsx
import { shallowEqual, usePaintState } from '@yorab/react-paint'

const canUndo = usePaintState(paint, state => state.history.canUndo)
const zoom = usePaintState(paint, state => state.view.zoom)
// a selector building an object or an array needs an equality function
const { shapes, selectedShapes } = usePaintState(paint, state => ({ shapes: state.shapes, selectedShapes: state.selectedShapes }), shallowEqual)
```

The handle also gives `actions` (the commands), `registerEvent` / `unregisterEvent`, `batch`, `getShape`, `getBounds`, `getShapesAt`, `resetCanvas`, `getCurrentImage` and `getCurrentData`. See [Driving the canvas from the code](#driving-the-canvas-from-the-code).

### Custom Editor

The handle is a public contract: `usePaintState` gives everything an editor needs to render (shapes, selection, active tool, history, zoom, hovered shape, context menu...) and `actions` holds the commands to act on the canvas. Set `paint.scopeRef` on the root element of your editor: it defines the area where keyboard shortcuts are active, which is only the canvas otherwise. The pointer always works over the canvas.

Under a `PaintProvider`, any component can get the handle with `usePaint`: each part of the editor reads only what it shows.

```tsx
import { Canvas, PaintProvider, type ReactPaint, shallowEqual, usePaint, usePaintState, useReactPaint } from '@yorab/react-paint/canvas'

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
    <div ref={paint.scopeRef}>
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

The canvas can be used alone, with `<Canvas paint={paint} />`: the pointer works as soon as it is over it, and keyboard shortcuts while the focus is inside it. The `Editor` component provides the handle to its children too, and a `PaintProvider` lets you place parts of your interface, like a toolbar, outside of the editor.

### Driving the canvas from the code

Everything the editor and the canvas gestures do can be done from the code, without the `Editor` and even without a mounted `Canvas`. Shapes are designated by their ids, which are kept in the exported data and when the data are loaded again.

```tsx
const paint = useReactPaint()

// a single step of the history, and a single dataChanged event, for the whole batch
const [rectId, textId] = paint.batch(() =>
  paint.actions.addShapes([
    { type: 'rect', x: 60, y: 60, width: 160, height: 100, style: { fillColor: 'yellow' }, data: { comment: 'to check' } },
    // the size of a text is computed from its font size
    { type: 'text', x: 280, y: 80, value: ['Created', 'from code'], fontSize: 28 }
  ])
)

paint.actions.updateShapes([{ id: rectId, x: 20, width: 200, style: { strokeColor: 'red' } }])
paint.actions.rotateShapes([rectId, textId], Math.PI / 12)
paint.actions.resizeShapes([textId], { x: 300, y: 300, width: 200, height: 80 })

paint.registerEvent('shapeClicked', (shape, { canvasPosition }) => console.log(shape.id, shape.data, canvasPosition))
```

| Operation | API |
| --- | --- |
| Create, update, remove shapes | `actions.addShapes(shapes, { select, index })`, `actions.updateShapes(patches)`, `actions.removeShapes(ids)` |
| Move, turn, resize, flip | `actions.translateShapes(ids, [dx, dy])`, `actions.rotateShapes(ids, angle, { center })`, `actions.resizeShapes(ids, box)`, `actions.transformShapes(ids, action)` |
| Style of shapes, default style of tools | `actions.setShapesStyle(ids, style, { updateTool })`, `actions.setToolStyle(toolId, style)` |
| Order | `actions.moveShapes(ids, 'first' \| 'last' \| 'forward' \| 'backward')`, `actions.setShapeIndex(id, index)`, `actions.reorderShapes(ids)` |
| Points of lines, polygons and curves | `actions.insertShapePoint`, `actions.moveShapePoint`, `actions.removeShapePoint` |
| Visibility, lock | `actions.setShapesVisibility(ids, visible)`, `actions.setShapesLocked(ids, locked)` |
| Selection | `actions.selectShapes(ids, { mode: 'replace' \| 'add' \| 'remove' })`, `actions.selectAllShapes()`, `actions.clearSelection()` |
| Text edition, context menu | `actions.editText(id)`, `actions.openContextMenu({ clientPosition, ids })`, `actions.closeContextMenu()` |
| Duplicate, copy, cut, paste | `actions.duplicateShapes`, `actions.copy`, `actions.cut`, `actions.paste` |
| History | `actions.undo()`, `actions.redo()`, `paint.batch(fn)` |
| View and grid | `actions.zoomTo(level, { center })`, `actions.zoomToShapes(ids, { padding })`, `actions.setZoom`, `actions.resetZoom`, `actions.panBy([dx, dy])`, `actions.setOffset`, `actions.setGridGap(GRID_PRESETS.medium)` |
| Options and settings | `actions.setOptions(options)`, `actions.resetOptions()`, `actions.resetSettings()` |
| Data and images | `actions.loadData(data)`, `actions.loadFile(file)`, `paint.getCurrentData()`, `paint.getCurrentImage({ view, format, quality, backgroundColor, backgroundImage })`, `actions.exportPicture`, `actions.exportData` |
| Read the shapes | `paint.getShape(id)`, `paint.getBounds(ids)`, `paint.getShapesAt(point)`, `usePaintState(paint, state => state.shapes)` |

- The actions changing shapes add a step to the history. Give `{ save: false }` for continuous changes, then call `actions.saveShapes()`, and `{ source: 'remote' }` to apply changes received from elsewhere: `dataChanged` gives this source.
- `addShapes` and `updateShapes` check their input and throw an error, without changing anything, when a shape is invalid. The style of a new shape is completed with the default style of its tool.
- The `data` field of a shape holds data of your application. It is not drawn, and is kept in the history, the copies and the exported data.
- The exported data (`getCurrentData`, `dataChanged`, `exportData`) round the positions and the sizes to 3 decimals, and the angles and the factors (`rotation`, `scaleX`, `scaleY`, `ratio`) to 6, which changes nothing visible. The shapes keep their full precision while drawing, and `data` and `style` are exported as they are.
- Coordinates are in the units of the drawing, angles are in radians, clockwise. The actions work in every mode: `viewer` and `disabled` only restrict the user.
- `shapeClicked` and `shapeHovered` are also emitted in viewer mode, to make the shapes clickable.
- `dataChanged(data, source, changes)` gives the shapes added, updated (with their previous version) and removed since the previous state, to send only what changed: `changes.added`, `changes.updated`, `changes.removed`, and `changes.reordered`. An undo gives the reverse changes.
- `setOptions` overrides options of `useReactPaint` until `resetOptions`. `resetSettings` restores what was changed while editing: the default styles of the tools, the grid, the zoom and the active tool.

### Picture annotation

To lay a picture under the canvas, give it the style returned by `useAnnotationsStyle(paint)`: it follows the zoom and the moves of the view. With `resize: 'extend'`, give the picture the size of the drawing in pixels, `width`×`height`, instead of the size of the canvas. To export the picture with the shapes, give the image element as `backgroundImage` to `paint.getCurrentImage` or `paint.actions.exportPicture`.

### Customizing the canvas styles

The styles of the canvas are inline. Some of its properties read a CSS variable: set it on any parent element (your wrapper, the editor, or the `style` prop of `Canvas`) to override the value computed by the canvas, without `!important`.

```css
.my-wrapper {
  --react-paint-app-canvas-bg: #fafafa;
}
```

| Variable | Element | Property |
| --- | --- | --- |
| `--react-paint-app-canvas-bg` | drawing area | `background-color`, instead of the `canvasBackgroundColor` option |
| `--react-paint-canvas-cursor` | drawing area | `cursor`: replaces every cursor of the gestures |
| `--react-paint-app-canvaswidth` | root | `max-width` with `resize` `'scaleDown'` and `'none'`, `min-width` with `'scaleUp'` and `'none'`, as a unitless number of pixels. Set on the editor or one of its parents, it bounds the editor too |
| `--react-paint-app-row-aspectratio` | root | `aspect-ratio`. Not with `resize: 'extend'` |
| `--react-paint-canvas-edittextbox-color`, `-opacity`, `-fontfamily` | text edition box | `color`, `opacity`, `font-family` |
| `--react-paint-canvas-edittextbox-transform`, `-fontsize`, `-padding` | text edition box | `transform`, `font-size`, `padding`: they follow the edited text, overriding them moves the box away from it |

The other properties of the canvas elements are not set inline, or keep the canvas working (stacked canvases, touch): style the root with the `className` and `style` props of `Canvas`.

### Performance

- Select precise slices of the state: a component reading `state.history.canUndo` does not render while a shape is dragged, one reading `state.shapes` does.
- When a selector builds an object or an array, give `shallowEqual` (or your own equality function) as third argument, otherwise the component renders on each change of the state.
- Read `state.interaction` (hovered shape, selection frame, modifier keys) only when you need it: it changes on each move of the pointer.
- In event handlers, read the state with `paint.getState()` instead of subscribing to it.

### Upgrading from 0.x

Version 1 replaces `editorProps` and `canvasProps` with a single handle and moves some options. See the [migration guide](https://github.com/YoRab/react-paint-editor/blob/main/MIGRATION.md).

## Compatibility

- **React**: 18 or 19, the only (peer) dependencies.
- **Browsers**: Chrome and Edge 98+, Firefox 94+, Safari 15.4+, with a mouse, a pen or touch (pinch to zoom). The automated tests run in Chromium.
- **Server-side rendering**: the components can be rendered on the server, the canvas draws once hydrated. The package has no `'use client'` directive: with the Next.js App Router, import it from a `'use client'` file.

## Documentation

For complete documentation, API reference, examples, and interactive demos, visit our **Storybook**:

**[📚 View Storybook Documentation](https://yorab.github.io/react-paint-editor/)**

The Storybook includes:
- Getting started guide
- Complete API reference
- Interactive playground
- Usage examples
- Configuration options

## Security

A drawing loaded from a source you do not control is untrusted, filter its pictures with the `resolvePictureSrc` option. The `icon` of a tool is rendered as HTML and must be trusted. See the [security model](https://github.com/YoRab/react-paint-editor/blob/main/SECURITY.md#security-model), and the [security policy](https://github.com/YoRab/react-paint-editor/blob/main/SECURITY.md#reporting-a-vulnerability) to report a vulnerability.

## Resources

- [Changelog](https://github.com/YoRab/react-paint-editor/blob/main/Changelog.md)
- [License](https://github.com/YoRab/react-paint-editor/blob/main/LICENSE.txt) (MIT)
- [GitHub Repository](https://github.com/YoRab/react-paint-editor)
- Questions and ideas: [GitHub Discussions](https://github.com/YoRab/react-paint-editor/discussions)
- Bug reports: [Issues](https://github.com/YoRab/react-paint-editor/issues)

## Contributing

Issues and pull requests are welcome. For a large change, open a discussion or an issue first.

The project uses Node 24 and pnpm (the version is set by the `packageManager` field, enable it with `corepack enable`). Pull requests target the `main` branch.

```bash
pnpm install
pnpm start                         # Storybook on http://localhost:6006
pnpm test                          # unit tests
npx playwright install chromium    # once, before the UI tests
pnpm test-storybook                # interaction and accessibility tests, in Chromium
pnpm lint                          # Biome, fixes what it can
```

Every pull request runs the [Build and Test workflow](https://github.com/YoRab/react-paint-editor/blob/main/.github/workflows/build-and-test.yaml).
