# Migrating from 0.x to 1.0

Version 1 splits the library into two independent modules, `canvas` and `editor`, which only communicate through `useReactPaint`. The editor is removed from your bundle when you don't use it, and `editorProps` becomes a documented contract you can use to build your own editor.

If you only use `useReactPaint`, `Canvas` and `Editor` without reading `editorProps` or `canvasProps`, most of the changes below won't affect you: check the [options](#editor-options-moved-to-editor) and [imports](#imports) sections.

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
  const { editorProps, canvasProps } = useReactPaint({
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
+ <Editor editorProps={editorProps} options={{ layersManipulation: false, withExport: false, withLoadAndSave: false, withUploadPicture: false, withUrlPicture: true }}>
    <Canvas canvasProps={canvasProps} />
  </Editor>
```

## Default tools

`DEFAULT_SHAPE_TOOLS` (editor) is replaced by `DEFAULT_TOOLS` (canvas). Default tools don't have an icon nor a label anymore: the editor resolves them from the tool type. Tools given in `options.availableTools` can still define their own `icon` and `label`.

The same goes for the selection and move tools, exported as `SELECTION_TOOL` and `MOVE_TOOL`: `icon` and `label` of `ActionsTool` become optional. Select them by id, with `actions.selectTool(SELECTION_TOOL.id)`.

`useReactPaint` from `@yorab/react-paint/canvas` now provides the default tools too, like the one from the package root.

## `canvasProps`

`canvasProps` is opaque: give it to `Canvas` without reading or changing it. Its `CanvasProps` type no longer exposes its content.

## `editorProps`

`editorProps` is now `{ state, actions, editorRef }`. Raw React setters and internal helpers are gone: the actions take shape ids and handle the engine work (refreshing shapes, computing text size, transform center...).

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
| `refs.setEditor` | `editorRef` |
| `refs.canvas` | removed: use `actions` |
| `backwardShape`, `forwardShape`, `saveShapes` | `actions.undo`, `actions.redo`, `actions.saveShapes` |
| `selectTool(tool)`, `setActiveTool` | `actions.selectTool(toolOrId)`: only the selection tool, the move tool and the tools can be selected |
| `setAvailableTools` | `actions.updateToolSettings(toolId, field, value)` |
| `selectShapes(shapes)`, `selectAllShapes` | `actions.selectShapes(ids)`, `actions.selectAllShapes` |
| `removeShape(shapes)` | `actions.removeShapes(ids)` |
| `duplicateShapes(shapes, translate, select)` | `actions.duplicateShapes(ids, { translate, select })` |
| `moveShapes(shapes, action)`, `swapShapes(id, id)` | `actions.moveShapes(ids, action)`, `actions.swapShapes(id, id)` |
| `toggleShapeVisibility(shapes)`, `toggleShapeLock(shapes)` | `actions.toggleShapesVisibility(ids)`, `actions.toggleShapesLock(ids)`, or `actions.setShapesVisibility(ids, visible)`, `actions.setShapesLocked(ids, locked)` |
| `updateShape` + `refreshShape` + `calculateTextFontSize` | `actions.updateShapesStyle(ids, field, value, { save })` |
| `transformShape(ctx, shapes, center, action)` | `actions.transformShapes(ids, action)` |
| `removeShapePoint(shape, index)` | `actions.removeShapePoint(id, index)`, and `state.contextMenu.canRemoveAnchor` to know if the point can be removed |
| `addPictureShape(fileOrUrl, maxWidth, maxHeight)` | `actions.addPicture(fileOrUrl, { maxWidth, maxHeight, select })` |
| `setCopiedShape`, `copyShapes`, `buildShapesGroup`, `pasteShapes` | `actions.copy(ids?)`, `actions.cut(ids?)`, `actions.paste()` |
| `setSelectionMode({ mode: 'default' })` to close the context menu | `actions.closeContextMenu()` |
| `setCanvasZoom`, `resetZoom`, `setGridGap` | `actions.setZoom`, `actions.resetZoom`, `actions.setGridGap` |
| `loadFile`, `exportPicture`, `exportData`, `clearCanvas` | same names in `actions` |

`actions` keeps the same identity between renders, so it can safely be used in hooks dependencies.

## Events

`registerEvent` and `unregisterEvent` are typed by event, and two events are added:

```ts
registerEvent('selectionChanged', (selectedShapes: ShapeEntity[]) => {})
registerEvent('toolChanged', (tool: ToolsType) => {})
```

`dataChanged` doesn't change.

## CSS

The class of the text edition box, which belongs to the canvas, is renamed from `react-paint-editor-toolbox-edittextbox` to `react-paint-canvas-edittextbox`, with its CSS variables (`--react-paint-canvas-edittextbox-*`).
