# Migrating from 0.x to 1.0

Version 1 splits the library into two independent modules, `canvas` and `editor`, which only communicate through the handle returned by `useReactPaint`. The editor is removed from your bundle when you don't use it, and the handle is a documented contract you can use to build your own editor.

`useReactPaint` now returns a single handle, `paint`, instead of `editorProps`, `canvasProps` and the other functions. Its identity never changes, and the component calling `useReactPaint` does not render again when the drawing changes: components read the part of the state they need with `usePaintState`.

## The handle

```diff
- const { editorProps, canvasProps } = useReactPaint(props)
+ const paint = useReactPaint(props)

- <Editor editorProps={editorProps}>
-   <Canvas canvasProps={canvasProps} />
+ <Editor paint={paint}>
+   <Canvas paint={paint} />
  </Editor>
```

The functions returned next to `editorProps` move to the handle:

| 0.x | 1.0 |
| --- | --- |
| `registerEvent`, `unregisterEvent` | `paint.registerEvent`, `paint.unregisterEvent`. `registerEvent` returns the function that unregisters the listener |
| `resetCanvas`, `getCurrentImage(view)`, `getCurrentData` | `paint.resetCanvas`, `paint.getCurrentImage({ view })`, `paint.getCurrentData`, see [exported data](#exported-data-and-images) |
| `resetZoom()`, `setCanvasZoom(action)`, `setCanvasOffset(offset)` | `paint.actions.resetZoom()`, `paint.actions.setZoom(action)`, `paint.actions.setOffset(offset)` |
| `annotationsProps.style` | `useAnnotationsStyle(paint)`, see [below](#annotationsprops) |

The props of `useReactPaint` don't change, except the `canGrow` and `canShrink` options, replaced by [`resize`](#cangrow-and-canshrink). Its `options` are compared by value: they can be written inline, without `useMemo`.

## Reading the state

`usePaintState(paint, selector?, isEqual?)` reads the state during a render, and renders the component again only when the selected value changes. In an event handler, read the current state with `paint.getState()` instead.

```tsx
const canUndo = usePaintState(paint, state => state.history.canUndo)
// a selector building an object or an array needs an equality function
const { shapes, selectedShapes } = usePaintState(paint, state => ({ shapes: state.shapes, selectedShapes: state.selectedShapes }), shallowEqual)
// without selector: the whole state, the component renders on each change
const state = usePaintState(paint)
```

Under the `Editor`, or a `PaintProvider`, any component can get the handle with `usePaint()`.

## Imports

`Canvas` and `Editor` are named exports in every entry point.

```diff
- import Canvas from '@yorab/react-paint/canvas'
- import Editor from '@yorab/react-paint/editor'
+ import { Canvas } from '@yorab/react-paint/canvas'
+ import { Editor } from '@yorab/react-paint/editor'
```

Imports from the package root don't change. The `Canvas` no longer needs a stylesheet, and the editor now also has its own, which `react-paint.css` still contains:

```ts
import '@yorab/react-paint/editor/editor.css'
```

## Editor options moved to `Editor`

Options that only drive the editor interface are now given to the `Editor` component:

```diff
  const paint = useReactPaint({
    options: {
      canZoom: 'always',
-     layersManipulation: false,
-     withExport: false,
-     withLoadAndSave: false,
-     withUploadPicture: false,
-     withUrlPicture: true
    }
  })

- <Editor editorProps={editorProps}>
+ <Editor paint={paint} options={{ layersManipulation: false, withExport: false, withLoadAndSave: false, withUploadPicture: false, withUrlPicture: true }}>
    <Canvas paint={paint} />
  </Editor>
```

## `canGrow` and `canShrink`

The `canGrow` and `canShrink` options are replaced by `resize`, which also adds `'extend'`: the canvas fills its container at the scale 1, and its visible area follows the container.

| 0.x | 1.0 |
| --- | --- |
| `canGrow: false, canShrink: true` (default) | `resize: 'scaleDown'` (default) |
| `canGrow: true, canShrink: true` | `resize: 'scale'` |
| `canGrow: true, canShrink: false` | `resize: 'scaleUp'` |
| `canGrow: false, canShrink: false` | `resize: 'none'` |

## Default tools

`DEFAULT_SHAPE_TOOLS` (editor) is replaced by `DEFAULT_TOOLS` (canvas). Default tools don't have an icon nor a label anymore: the editor resolves them from the tool type. Tools given in `options.availableTools` can still define their own `icon` and `label`.

The same goes for the selection and move tools, exported as `SELECTION_TOOL` and `MOVE_TOOL`: `icon` and `label` of `ActionsTool` become optional. Select them by id, with `paint.actions.selectTool(SELECTION_TOOL.id)`.

`ActionsType`, the type of `ActionsTool`, is reduced to the tools handled by the canvas: `'selection' | 'move' | 'eraser' | 'laser'`. The buttons of the editor (`undo`, `redo`, `clear`, `export`, `loadfile`, `savefile`, `uploadpicture`, `addurlpicture`) are not part of the API anymore: a custom editor calls the matching actions (`paint.actions.undo()`, `paint.actions.exportPicture({ view })`...) from its own buttons.

`useReactPaint` from `@yorab/react-paint/canvas` now provides the default tools too, like the one from the package root.

## `canvasProps`

`canvasProps` is removed: give the handle to `Canvas`, with `<Canvas paint={paint} />`. The `CanvasProps` type is removed too.

## `editorProps`

`editorProps` is removed. Its state is read with `usePaintState`, and its functions become actions on `paint.actions`. Raw React setters and internal helpers are gone: the actions take shape ids and handle the engine work (refreshing shapes, computing text size, transform center...).

In the table below, `state.x` stands for `usePaintState(paint, state => state.x)` during a render, or `paint.getState().x` in a handler.

| 0.x | 1.0 |
| --- | --- |
| `shapes`, `selectedShape`, `activeTool`, `availableTools` | `state.shapes`, `state.selection` (or `state.selectedShapes`), `state.activeTool`, `state.tools` |
| `canGoBackward`, `canGoForward`, `canClear` | `state.history.canUndo`, `state.history.canRedo`, `state.history.canClear` |
| `copiedShape` | `state.clipboard.hasContent` |
| `width`, `height`, `isEditMode` | `state.width`, `state.height`, `state.mode` |
| `settings.canvasZoom`, `settings.canvasOffset`, `settings.canvasSize` | `state.view.zoom`, `state.view.offset`, `state.view.displayWidth` / `displayHeight` / `scaleRatio` |
| `settings.features`, `settings.size` | `state.features`, `state.layout.size` |
| `gridGap` | `state.gridGap` |
| `canvas.canGrow`, `canvas.canShrink`, `canvas.withContextMenu` | `state.layout.resize`, see [`canGrow` and `canShrink`](#cangrow-and-canshrink), `state.withContextMenu` |
| `canvas.layersManipulation`, `canvas.withExport`, ... | `Editor` options |
| `selectionMode` | `state.interaction.mode`, and `state.contextMenu` when the context menu is open |
| `refs.setEditor` | `paint.scopeRef`, only needed to widen the area of the keyboard shortcuts beyond the `Canvas` |
| `refs.canvas` | removed: use `paint.actions` |
| `backwardShape`, `forwardShape`, `saveShapes` | `paint.actions.undo`, `paint.actions.redo`, `paint.actions.saveShapes` |
| `selectTool(tool)`, `setActiveTool` | `paint.actions.selectTool(toolOrId)`: only the selection tool, the move tool and the tools can be selected |
| `setAvailableTools` | `paint.actions.updateToolSettings(toolId, field, value)` |
| `selectShapes(shapes)`, `selectAllShapes` | `paint.actions.selectShapes(ids)`, `paint.actions.selectAllShapes` |
| `removeShape(shapes)` | `paint.actions.removeShapes(ids)` |
| `duplicateShapes(shapes, translate, select)` | `paint.actions.duplicateShapes(ids, { translate, select })` |
| `moveShapes(shapes, action)`, `swapShapes(id, id)` | `paint.actions.moveShapes(ids, action)`, `paint.actions.swapShapes(id, id)` |
| `toggleShapeVisibility(shapes)`, `toggleShapeLock(shapes)` | `paint.actions.toggleShapesVisibility(ids)`, `paint.actions.toggleShapesLock(ids)`, or `paint.actions.setShapesVisibility(ids, visible)`, `paint.actions.setShapesLocked(ids, locked)` |
| `updateShape` + `refreshShape` + `calculateTextFontSize` | `paint.actions.updateShapesStyle(ids, field, value, { save })` |
| `transformShape(ctx, shapes, center, action)` | `paint.actions.transformShapes(ids, action)` |
| `removeShapePoint(shape, index)` | `paint.actions.removeShapePoint(id, index)`, and `state.contextMenu.canRemoveAnchor` to know if the point can be removed |
| `addPictureShape(fileOrUrl, maxWidth, maxHeight)` | `paint.actions.addPicture(fileOrUrl, { maxWidth, maxHeight, select })` |
| `setCopiedShape`, `copyShapes`, `buildShapesGroup`, `pasteShapes` | `paint.actions.copy(ids?)`, `paint.actions.cut(ids?)`, `paint.actions.paste()` |
| `setSelectionMode({ mode: 'default' })` to close the context menu | `paint.actions.closeContextMenu()` |
| `setCanvasZoom`, `resetZoom`, `setGridGap` | `paint.actions.setZoom`, `paint.actions.resetZoom`, `paint.actions.setGridGap` |
| `loadFile`, `exportPicture(view)`, `exportData`, `clearCanvas` | `paint.actions.loadFile`, `paint.actions.exportPicture({ view })`, `paint.actions.exportData`, `paint.actions.clearCanvas` |

`paint` and `paint.actions` keep the same identity for the whole life of the component, so they can safely be used in hooks dependencies.

The `EditorProps` type is replaced by `ReactPaint`, the type of the handle. `UseReactPaintReturnType` is an alias of `ReactPaint`.

## Events

`registerEvent` and `unregisterEvent` are typed by event, and two events are added:

```ts
paint.registerEvent('selectionChanged', (selectedShapes: ShapeEntity[]) => {})
paint.registerEvent('toolChanged', (tool: ToolsType) => {})
```

`registerEvent` returns the function that unregisters the listener, which fits the cleanup of an effect:

```ts
useEffect(() => paint.registerEvent('dataChanged', (data, source) => save(data)), [paint])
```

The events are emitted right after the change of the state, before React renders it. `dataChanged` keeps its first two arguments, and receives a third one: the shapes added, updated and removed since the previous state.

## `annotationsProps`

`annotationsProps.style` is replaced by the `useAnnotationsStyle` hook, which keeps an element laid over the canvas aligned with the zoom and the moves of the view:

```diff
- const { editorProps, canvasProps, annotationsProps } = useReactPaint(props)
- <img src={src} style={annotationsProps.style} />
+ const paint = useReactPaint(props)
+ const annotationsStyle = useAnnotationsStyle(paint)
+ <img src={src} style={annotationsStyle} />
```

## Exported data and images

The shapes keep their `id` in the exported data (`getCurrentData`, `dataChanged`, `exportData`), and when they are loaded again: an application can store data linked to a shape by its id. A missing or already used id is replaced by a new one. The ids of new shapes are random, like `rect_0b6c…`, instead of a counter.

`getCurrentImage` and `exportPicture` take an object of options instead of the view:

```diff
- paint.getCurrentImage('fitToShapes')
+ paint.getCurrentImage({ view: 'fitToShapes' })
- paint.actions.exportPicture('currentZoom')
+ paint.actions.exportPicture({ view: 'currentZoom', format: 'jpeg', quality: 0.9, fileName: 'drawing.jpg' })
```

The options also give a `backgroundColor`, and a `backgroundImage` drawn under the shapes, like the picture laid under the canvas with `useAnnotationsStyle`.

## Other changes

- `updateToolSettings` ignores a field the tool has not, instead of adding it.
- `transformShapes` no longer selects the transformed shapes.
- The grid follows a change of the `grid` option after the creation.
- `style.lineArrow` (0 to 3) is replaced by `style.arrowStart` and `style.arrowEnd`, which take a head (`'none'`, `'triangle'`, `'open'`, `'circle'`...), and `style.arrowSize`: `lineArrow: 1` becomes `arrowStart: 'triangle'`, `lineArrow: 2` becomes `arrowEnd: 'triangle'`, and `lineArrow: 3` both. `lineArrow` is no longer read: a shape loaded with it has no arrows. The `lineArrow` setting of the tools is replaced the same way.
- The `'triangle'` shape type is removed: it was only built by the canvas for the arrows of the lines.
- `ShapeEntity` has no `selection` field anymore: the outline and the anchors of a selection are drawn from the shape (`path`, `computed.borders`) at the scale of the view.
- Several shapes selected together are framed by a `MultiSelection` (`state.selection.type === 'multiSelection'`), instead of a shape of type `'group'`: `state.selection` is a `SelectionType`, the selected shape or this frame. Its box is in `computed.borders`, it has no `x`, `y`, `width` and `height`. Read the selected shapes with `state.selectedShapes`, or `getSelectedShapes(state.selection)`.
- The drawing can hold groups, shapes of type `'group'` which hold their shapes in `shapes`: `state.shapes`, `state.selectedShapes`, `getSelectedShapes`, the exported data (`StateData`, `dataChanged`, `getCurrentData`) and the data loaded can give groups, and `ShapeInput` accepts them. Code walking the shapes reaches all of them with `flattenShapes(shapes)`, or the shapes drawn with `getShapeLeaves(shapes)`, and finds the group of a shape with `getParentGroup`. A group has no `x`, `y`, `width` nor `height`: its box is given by `paint.getBounds([id])`. `dataChanged` lists the shapes of the groups too: when `changes.reordered` is set, a shape may have changed its group, build the drawing again from `data.shapes`.

Everything the editor does can now be done from the code: see [Driving the canvas from the code](./README.md#driving-the-canvas-from-the-code).

## CSS

The class of the text edition box, which belongs to the canvas, is renamed from `react-paint-editor-toolbox-edittextbox` to `react-paint-canvas-edittextbox`, with its CSS variables (`--react-paint-canvas-edittextbox-*`).

The styles of the canvas are now inline: `react-paint.css` only contains the styles of the editor. Its CSS variables keep their names, but the canvas now reads them instead of setting them: set one on a parent element to override the value of the canvas, without `!important` (see [Customizing the canvas styles](./README.md#customizing-the-canvas-styles)). The class names of the canvas elements are kept: a stylesheet overriding another inline property needs `!important`, prefer the `style` and `className` props of `Canvas`, which apply to its root element.
