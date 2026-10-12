import type { UtilsSettings } from '@canvas/constants/app'
import type { CanvasSize } from '@common/types/Canvas'
import type { EditorActions, ZoomAction } from '@common/types/editor'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'

declare const canvasPropsBrand: unique symbol

/**
 * Props to give as is to the Canvas component. Their content is internal to the library:
 * they must not be read nor altered.
 */
export type CanvasProps = { readonly [canvasPropsBrand]: true }

export type InternalCanvasProps = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  hasCopiedShape: boolean
  copy: EditorActions['copy']
  cut: EditorActions['cut']
  paste: EditorActions['paste']
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined
  hoveredShape: ShapeEntity | undefined
  addShape: (newShapes: ShapeEntity[]) => void
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
  setSelectionFrame: React.Dispatch<React.SetStateAction<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>>
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point) => void
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  removeShape: (shapes: ShapeEntity[]) => void
  updateShape: (updatedShapes: ShapeEntity[], withSave?: boolean) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[], translate?: boolean, selectNewOnes?: boolean) => void
  backwardShape: () => void
  forwardShape: () => void
  saveShapes: () => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  width: number
  height: number
  selectAllShapes: () => void
  activeTool: ToolsType
  setActiveTool: (tool: ToolsType) => void
  isEditMode: boolean
  settings: UtilsSettings
  setCanvasZoom: (action: ZoomAction) => void
  resetZoom: () => void
  setCanvasSize: React.Dispatch<React.SetStateAction<CanvasSize>>
  setCanvasOffset: (offset: Point) => void
  isInsideComponent: boolean
  isInsideCanvas: boolean
  canvas: {
    withContextMenu: boolean
    withSkeleton: boolean
    withFrameSelection: boolean
    canGrow: boolean
    canShrink: boolean
  }
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined
  setCanvasOffsetStartData: React.Dispatch<React.SetStateAction<{ start: Point; originalOffset: Point } | undefined>>
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  setCanvasMoveAcceleration: React.Dispatch<React.SetStateAction<Point>>
  isShiftPressed: boolean
  isAltPressed: boolean
  isSpacePressed: boolean
  setShiftPressed: React.Dispatch<React.SetStateAction<boolean>>
  setAltPressed: React.Dispatch<React.SetStateAction<boolean>>
  setIsSpacePressed: React.Dispatch<React.SetStateAction<boolean>>
}
