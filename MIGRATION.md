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
| `resetCanvas`, `getCurrentImage`, `getCurrentData` | `paint.resetCanvas`, `paint.getCurrentImage`, `paint.getCurrentData` |
| `resetZoom()`, `setCanvasZoom(action)`, `setCanvasOffset(offset)` | `paint.actions.resetZoom()`, `paint.actions.setZoom(action)`, `paint.actions.setOffset(offset)` |
| `annotationsProps.style` | `useAnnotationsStyle(paint)`, see [below](#annotationsprops) |

The props of `useReactPaint` don't change. Its `options` are compared by value: they can be written inline, without `useMemo`.

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

Imports from the package root don't change. Each module now also has its own stylesheet, `react-paint.css` still contains both:

```ts
import '@yorab/react-paint/canvas/canvas.css'
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

## Default tools

`DEFAULT_SHAPE_TOOLS` (editor) is replaced by `DEFAULT_TOOLS` (canvas). Default tools don't have an icon nor a label anymore: the editor resolves them from the tool type. Tools given in `options.availableTools` can still define their own `icon` and `label`.

The same goes for the selection and move tools, exported as `SELECTION_TOOL` and `MOVE_TOOL`: `icon` and `label` of `ActionsTool` become optional. Select them by id, with `paint.actions.selectTool(SELECTION_TOOL.id)`.

`ActionsType`, the type of `ActionsTool`, is reduced to the tools handled by the canvas: `'selection' | 'move'`. The buttons of the editor (`undo`, `redo`, `clear`, `export`, `loadfile`, `savefile`, `uploadpicture`, `addurlpicture`) are not part of the API anymore: a custom editor calls the matching actions (`paint.actions.undo()`, `paint.actions.exportPicture(view)`...) from its own buttons.

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
| `canvas.canGrow`, `canvas.canShrink`, `canvas.withContextMenu` | `state.layout.canGrow`, `state.layout.canShrink`, `state.withContextMenu` |
| `canvas.layersManipulation`, `canvas.withExport`, ... | `Editor` options |
| `selectionMode` | `state.interaction.mode`, and `state.contextMenu` when the context menu is open |
| `refs.setEditor` | `paint.editorRef` |
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
| `loadFile`, `exportPicture`, `exportData`, `clearCanvas` | same names in `paint.actions` |

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

The events are emitted right after the change of the state, before React renders it. `dataChanged` doesn't change otherwise.

## `annotationsProps`

`annotationsProps.style` is replaced by the `useAnnotationsStyle` hook, which keeps an element laid over the canvas aligned with the zoom and the moves of the view:

```diff
- const { editorProps, canvasProps, annotationsProps } = useReactPaint(props)
- <img src={src} style={annotationsProps.style} />
+ const paint = useReactPaint(props)
+ const annotationsStyle = useAnnotationsStyle(paint)
+ <img src={src} style={annotationsStyle} />
```

## CSS

The class of the text edition box, which belongs to the canvas, is renamed from `react-paint-editor-toolbox-edittextbox` to `react-paint-canvas-edittextbox`, with its CSS variables (`--react-paint-canvas-edittextbox-*`).
