import type { OptionalOptions } from '@canvas/constants/app'
import type { Resize, Size } from '@canvas/types/Canvas'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { ExportedShape, Point, Rect, ShapeEntity, ShapeInput, ShapePatch, StateData, StyleShape } from '@canvas/types/Shapes'
import type { CustomTool, ToolsType } from '@canvas/types/tools'

/*
 * Public contract between the canvas module (which implements it with useReactPaint)
 * and any editor (the one provided by the library or a custom one).
 */

export type InteractionMode = SelectionModeData<Point | number>['mode']

export type ExportView = 'fitToShapes' | 'defaultView' | 'currentZoom'

export type ZoomAction = 'unzoom' | 'zoom' | 'default'

export type ShapesOrderAction = 'first' | 'last' | 'forward' | 'backward'

export type ShapesTransformAction = 'flipHorizontally' | 'flipVertically' | 'rotateClockwise' | 'rotateCounterclockwise'

export type ShapeStyleField = keyof StyleShape

export type ToolSettingValue = string | number | boolean

export type ContextMenuState = {
  /** Shapes targeted by the context menu (empty when opened on an empty area) */
  shapes: ShapeEntity[]
  /** Index of the curve / polygon point under the cursor, if any */
  anchorIndex: number | undefined
  /** Whether this point can be removed with actions.removeShapePoint: a polygon or a curve keeps at least 2 points */
  canRemoveAnchor: boolean
  /** Cursor position in canvas logical coordinates */
  canvasPosition: Point
  /** Cursor position in viewport coordinates, convenient for a position: fixed menu */
  clientPosition: { x: number; y: number }
}

export type InteractionState = {
  mode: InteractionMode
  hoveredShape: ShapeEntity | undefined
  selectionFrame: [Point, Point] | undefined
  modifiers: { shift: boolean; alt: boolean; space: boolean }
  isPanning: boolean
  focus: { component: boolean; canvas: boolean }
}

export type EditorState = {
  mode: 'editor' | 'viewer'
  disabled: boolean
  features: { edition: boolean; zoom: boolean }
  /** Logical size of the drawing: the visible area follows the container when the resize option is 'extend' */
  width: number
  height: number
  layout: { size: Size; resize: Resize }
  view: { zoom: number; offset: Point; displayWidth: number; displayHeight: number; scaleRatio: number }
  gridGap: number
  shapes: ShapeEntity[]
  /** Selected shape, or group of shapes when several are selected */
  selection: ShapeEntity | undefined
  selectedShapes: ShapeEntity[]
  /** Ids of the selected shapes, to give to the actions. The array keeps its identity while the same shapes are selected */
  selectedShapeIds: string[]
  /** One of the selection tool, the move tool or the tools */
  activeTool: ToolsType
  tools: CustomTool[]
  history: { canUndo: boolean; canRedo: boolean; canClear: boolean }
  clipboard: { hasContent: boolean }
  withContextMenu: boolean
  interaction: InteractionState
  contextMenu: ContextMenuState | undefined
}

/** Origin of a change of the drawing, given to dataChanged: changes received from elsewhere can be applied as 'remote' */
export type ChangeSource = 'user' | 'remote'

/** Changes of the shapes given to dataChanged, from the previous state of the drawing: an undo gives the reverse changes */
export type DataChanges = {
  /** Shapes created, as exported */
  added: ExportedShape[]
  /** Shapes modified, with their version before the change */
  updated: { shape: ExportedShape; previous: ExportedShape }[]
  /** Shapes deleted, in their last version */
  removed: ExportedShape[]
  /** Whether the shapes still there are in another order */
  reordered: boolean
}

/** Options of the actions which change the shapes */
export type ShapesActionOptions = {
  /** Adds a step to the history, true by default. A continuous change (like a slider) saves only its last step */
  save?: boolean
  /** Origin of the change given to dataChanged, 'user' by default */
  source?: ChangeSource
}

export type SelectionUpdateMode = 'replace' | 'add' | 'remove'

/** Box of shapes, in the frame of their selection: turned by their rotation when they all have the same one */
export type ShapesBounds = Rect & { rotation: number; center: Point }

export type ExportImageFormat = 'png' | 'jpeg' | 'webp'

export type ExportImageOptions = {
  /** Area exported, 'defaultView' by default */
  view?: ExportView
  /** 'png' by default */
  format?: ExportImageFormat
  /** Quality between 0 and 1, for the jpeg and webp formats */
  quality?: number
  /** Color drawn under the shapes. A jpeg is white by default */
  backgroundColor?: string
  /**
   * Image drawn under the shapes, over the whole canvas, like the picture laid under the canvas with useAnnotationsStyle.
   * An image from another origin without CORS headers makes the export fail with a SecurityError
   */
  backgroundImage?: CanvasImageSource
}

export type EditorActions = {
  /** Selects one of the selection tool, the move tool or the tools, found by id. An unknown tool is ignored */
  selectTool: (toolOrId: ToolsType | string) => void
  /** Sets the default value of a setting of a tool. A field the tool has not is ignored */
  updateToolSettings: (toolId: string, field: string, value: ToolSettingValue) => void
  /** Sets several default values of a tool, used by the next shapes drawn with it. The fields the tool has not are ignored */
  setToolStyle: (toolId: string, style: StyleShape) => void

  /** Selects the shapes, adds them to the selection or removes them from it ('replace' by default) */
  selectShapes: (ids: string[], options?: { mode?: SelectionUpdateMode }) => void
  selectAllShapes: () => void
  clearSelection: () => void

  /**
   * Creates shapes and returns their ids. An id given with a shape is kept when it is free. The style is completed with
   * the defaults of the tool of the shape, and the size of a text can be left out. A picture is drawn once its source is
   * loaded. Throws an error, without creating any shape, when one of them is invalid
   */
  addShapes: (shapes: ShapeInput[], options?: ShapesActionOptions & { select?: boolean; index?: number }) => string[]
  /**
   * Updates fields of shapes, found by their ids: geometry, points, text, style (merged), data (replaced)...
   * The box of a text follows its new content or font size, its font size follows its new width or font. Throws an error, without
   * changing anything, when a patch is invalid. Locked shapes are updated too
   */
  updateShapes: (patches: ShapePatch[], options?: ShapesActionOptions) => void
  removeShapes: (ids: string[], options?: ShapesActionOptions) => void
  duplicateShapes: (ids: string[], options?: { translate?: boolean; select?: boolean }) => void

  /** Moves the shapes by a vector, in the units of the drawing. Locked shapes do not move */
  translateShapes: (ids: string[], vector: Point, options?: ShapesActionOptions) => void
  /** Turns the shapes by an angle in radians, clockwise, around their center or the given point. Locked shapes do not turn */
  rotateShapes: (ids: string[], angle: number, options?: ShapesActionOptions & { center?: Point }) => void
  /**
   * Resizes the shapes so that their box (see getBounds) becomes the given one. When one of them keeps its
   * proportions (square, circle, picture, text), the box keeps them too, from its top left corner. Locked shapes do not change
   */
  resizeShapes: (ids: string[], bounds: Rect, options?: ShapesActionOptions) => void
  /** Flips or turns by a quarter the shapes, around their center */
  transformShapes: (ids: string[], action: ShapesTransformAction) => void

  setShapesStyle: (ids: string[], style: StyleShape, options?: ShapesActionOptions & { updateTool?: boolean }) => void
  /** Sets one field of the style. With save false, the change is not added to the history, like while a slider moves */
  updateShapesStyle: (ids: string[], field: ShapeStyleField, value: ToolSettingValue, options?: { save?: boolean }) => void

  moveShapes: (ids: string[], action: ShapesOrderAction) => void
  swapShapes: (firstId: string, secondId: string) => void
  /** Moves a shape at an index of the shapes, 0 being the foreground */
  setShapeIndex: (id: string, index: number) => void
  /** Orders the shapes from the foreground. The shapes left out stay behind, in their current order */
  reorderShapes: (orderedIds: string[]) => void

  toggleShapesVisibility: (ids: string[]) => void
  toggleShapesLock: (ids: string[]) => void
  setShapesVisibility: (ids: string[], visible: boolean) => void
  setShapesLocked: (ids: string[], locked: boolean) => void

  /** Inserts a point in a polygon or a curve, before the point at this index (at the end when the index is the length) */
  insertShapePoint: (id: string, index: number, point: Point) => void
  /** Moves a point of a line, a polygon or a curve */
  moveShapePoint: (id: string, index: number, point: Point) => void
  /** Removes a point of a polygon or a curve, unless it would keep less than 2 points */
  removeShapePoint: (id: string, pointIndex: number) => void
  /** Selects a text and opens its edition box, like a double click. Does nothing when the Canvas is not mounted */
  editText: (id: string) => void
  /** Adds a picture from a file or an URL, at the center of the visible area, or centered on the position (in the units of the drawing) */
  addPicture: (
    fileOrUrl: File | string,
    options?: { maxWidth?: number; maxHeight?: number; select?: boolean; position?: Point }
  ) => Promise<ShapeEntity>

  copy: (ids?: string[]) => void
  cut: (ids?: string[]) => void
  paste: () => void

  undo: () => void
  redo: () => void
  saveShapes: () => void

  clearCanvas: () => void
  loadFile: (file: File) => Promise<void>
  /** Loads exported data, or their JSON string. The history is cleared by default */
  loadData: (data: StateData | { shapes?: ShapeInput[] } | string, options?: { clearHistory?: boolean }) => Promise<void>
  exportPicture: (options?: ExportImageOptions & { fileName?: string }) => void
  exportData: (options?: { fileName?: string }) => void

  setZoom: (action: ZoomAction) => void
  /** Sets the zoom level, keeping the given point of the drawing still (the center of the view by default) */
  zoomTo: (level: number, options?: { center?: Point }) => void
  /**
   * Zooms and scrolls the view so that the shapes fill it, all the visible shapes by default. The padding is a margin in
   * pixels of the screen. The zoom stays within its limits, and the view inside the canvas when its size is fixed
   */
  zoomToShapes: (ids?: string[], options?: { padding?: number }) => void
  resetZoom: () => void
  /** Moves the view: the offset is kept inside the canvas when its size is fixed */
  setOffset: (offset: Point) => void
  /** Scrolls the view by a vector in the units of the drawing */
  panBy: (vector: Point) => void
  /** Sets the gap of the grid, which the shapes snap to. 0 hides it, see GRID_PRESETS */
  setGridGap: (gap: number) => void

  /** Opens the context menu at a position of the viewport, for the given shapes or else the selection. Does nothing when the context menu is disabled */
  openContextMenu: (options: { clientPosition: { x: number; y: number }; canvasPosition?: Point; ids?: string[] }) => void
  /** Closes the context menu and gives the focus back to the canvas. Does nothing when the menu is not open */
  closeContextMenu: () => void

  /**
   * Overrides options of useReactPaint. The overrides are kept over the props until resetOptions: objects are merged,
   * arrays (like availableTools) are replaced
   */
  setOptions: (options: OptionalOptions) => void
  /** Removes the overrides of setOptions: the options come back to the props */
  resetOptions: () => void
  /** Restores the settings changed while editing: the default styles of the tools, the grid, the zoom and the active tool */
  resetSettings: () => void
}

/** Pointer event over a shape */
export type ShapePointerInfo = {
  /** Position in the units of the drawing */
  canvasPosition: Point
  /** Position in the viewport, convenient for a position: fixed element */
  clientPosition: { x: number; y: number }
  originalEvent: PointerEvent
}

export type ReactPaintEvents = {
  /** The drawing changes: its data, the origin of the change, and the shapes added, updated and removed */
  dataChanged: (data: StateData, source: ChangeSource, changes: DataChanges) => void
  selectionChanged: (selectedShapes: ShapeEntity[]) => void
  toolChanged: (tool: ToolsType) => void
  /** A visible shape is clicked, also in viewer mode. Locked shapes are clicked too */
  shapeClicked: (shape: ShapeEntity, info: ShapePointerInfo) => void
  /** The pointer enters a visible shape, or leaves it (undefined). Only computed while a listener is registered */
  shapeHovered: (shape: ShapeEntity | undefined, info: ShapePointerInfo) => void
  /** A file dropped on the canvas is not added as a picture: its type is not an accepted image, or the image could not be loaded */
  pictureDropFailed: (file: File, error: unknown) => void
}

export type ReactPaintEventName = keyof ReactPaintEvents

/**
 * Handle returned by useReactPaint, given to the Canvas and Editor components. Its identity never changes:
 * read the state with usePaintState during a render, or with getState in a handler.
 */
export type ReactPaint = {
  actions: EditorActions
  /** Current state, without subscription. The same object is returned as long as nothing changes */
  getState: () => EditorState
  /** Calls the listener after each change of the state. Returns the function that unsubscribes it */
  subscribe: (listener: () => void) => () => void
  /** Returns the function that unregisters the listener */
  registerEvent: <E extends ReactPaintEventName>(event: E, fn: ReactPaintEvents[E]) => () => void
  /** Unregisters the listener, or all the listeners of the event when none is given */
  unregisterEvent: <E extends ReactPaintEventName>(event: E, fn?: ReactPaintEvents[E]) => void
  /**
   * Runs the function: the changes it makes give a single step of the history, a single dataChanged event and a single
   * render. The changes made before an error are kept
   */
  batch: <R>(fn: () => R) => R
  /** A shape found by its id */
  getShape: (id: string) => ShapeEntity | undefined
  /** Box of the shapes, without the padding of the selection */
  getBounds: (ids: string[]) => ShapesBounds | undefined
  /** Visible shapes under a point of the drawing, from the foreground. Needs a browser */
  getShapesAt: (point: Point) => ShapeEntity[]
  resetCanvas: (shapes?: ShapeInput[], clearHistory?: boolean) => void
  getCurrentImage: (options?: ExportImageOptions) => string
  getCurrentData: () => StateData
  /**
   * Callback ref of the area where the keyboard shortcuts are active, the Canvas by default. The pointer always works over the Canvas.
   * Set it on the root element of an editor so that the shortcuts also work while its toolbar is focused. The Editor component sets it
   */
  scopeRef: (element: HTMLElement | null) => void
}
