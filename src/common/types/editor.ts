import type { Size } from '@common/types/Canvas'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity, StateData, StyleShape } from '@common/types/Shapes'
import type { CustomTool, ToolsType } from '@common/types/tools'

/*
 * Public contract between the canvas module (which implements it in useReactPaint)
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
  setGridGap: (gap: number) => void
  closeContextMenu: () => void
}

export type EditorProps = {
  state: EditorState
  actions: EditorActions
  /** Callback ref to set on the editor root element, used to scope keyboard shortcuts */
  editorRef: (element: HTMLElement | null) => void
}

export type ReactPaintEvents = {
  dataChanged: (data: StateData, source: 'user' | 'remote') => void
  selectionChanged: (selectedShapes: ShapeEntity[]) => void
  toolChanged: (tool: ToolsType) => void
}

export type ReactPaintEventName = keyof ReactPaintEvents
