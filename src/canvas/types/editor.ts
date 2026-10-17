import type { Size } from '@canvas/types/Canvas'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { ExportedDrawableShape, Point, ShapeEntity, StateData, StyleShape } from '@canvas/types/Shapes'
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
  /** Logical size of the canvas */
  width: number
  height: number
  layout: { size: Size; canGrow: boolean; canShrink: boolean }
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

export type EditorActions = {
  /** Selects one of the selection tool, the move tool or the tools, found by id. An unknown tool is ignored */
  selectTool: (toolOrId: ToolsType | string) => void
  updateToolSettings: (toolId: string, field: string, value: ToolSettingValue) => void

  selectShapes: (ids: string[]) => void
  selectAllShapes: () => void
  clearSelection: () => void

  removeShapes: (ids: string[]) => void
  duplicateShapes: (ids: string[], options?: { translate?: boolean; select?: boolean }) => void
  moveShapes: (ids: string[], action: ShapesOrderAction) => void
  swapShapes: (firstId: string, secondId: string) => void
  toggleShapesVisibility: (ids: string[]) => void
  toggleShapesLock: (ids: string[]) => void
  setShapesVisibility: (ids: string[], visible: boolean) => void
  setShapesLocked: (ids: string[], locked: boolean) => void
  updateShapesStyle: (ids: string[], field: ShapeStyleField, value: ToolSettingValue, options?: { save?: boolean }) => void
  transformShapes: (ids: string[], action: ShapesTransformAction) => void
  /** Removes a point of a polygon or a curve, unless it would keep less than 2 points */
  removeShapePoint: (id: string, pointIndex: number) => void
  addPicture: (fileOrUrl: File | string, options?: { maxWidth?: number; maxHeight?: number; select?: boolean }) => Promise<ShapeEntity>

  copy: (ids?: string[]) => void
  cut: (ids?: string[]) => void
  paste: () => void

  undo: () => void
  redo: () => void
  saveShapes: () => void

  clearCanvas: () => void
  loadFile: (file: File) => Promise<void>
  exportPicture: (view: ExportView) => void
  exportData: () => void
  setZoom: (action: ZoomAction) => void
  resetZoom: () => void
  /** Moves the view: the offset is kept inside the canvas when its size is fixed */
  setOffset: (offset: Point) => void
  setGridGap: (gap: number) => void
  /** Closes the context menu and gives the focus back to the canvas. Does nothing when the menu is not open */
  closeContextMenu: () => void
}

export type ReactPaintEvents = {
  dataChanged: (data: StateData, source: 'user' | 'remote') => void
  selectionChanged: (selectedShapes: ShapeEntity[]) => void
  toolChanged: (tool: ToolsType) => void
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
  resetCanvas: (shapes?: ExportedDrawableShape[], clearHistory?: boolean) => void
  getCurrentImage: (view: ExportView) => string
  getCurrentData: () => StateData
  /**
   * Callback ref of the area where the keyboard shortcuts are active, the Canvas by default. The pointer always works over the Canvas.
   * Set it on the root element of an editor so that the shortcuts also work while its toolbar is focused. The Editor component sets it
   */
  scopeRef: (element: HTMLElement | null) => void
}
