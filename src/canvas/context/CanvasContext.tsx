import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import type React from 'react'
import { createContext, useContext } from 'react'

export type CanvasContextType = {
  // Reactive data
  shapes: ShapeEntity[]
  settings: UtilsSettings
  selectedShape: SelectionType | undefined
  hoveredShape: ShapeEntity | undefined
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined
  selectionMode: SelectionModeData<number | Point>
  activeTool: ToolsType
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined
  isInsideComponent: boolean
  isInsideCanvas: boolean
  isShiftPressed: boolean
  isAltPressed: boolean
  isSpacePressed: boolean
  // Visual options (from App options, not canvasProps)
  selectionColor: string
  selectionWidth: number
  // Feature flags
  isEditMode: boolean
  canGrow: boolean | undefined
  withFrameSelection: boolean
  withSkeleton: boolean
  withContextMenu: boolean
  // Stable setters (references don't change between renders)
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
  setSelectionFrame: React.Dispatch<React.SetStateAction<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  setCanvasOffsetStartData: React.Dispatch<React.SetStateAction<{ start: Point; originalOffset: Point } | undefined>>
  setCanvasOffset: (offset: Point) => void
  setCanvasMoveAcceleration: React.Dispatch<React.SetStateAction<Point>>
  // Business functions
  addShapes: (newShapes: ShapeEntity[]) => void
  updateSingleShape: (updatedShape: ShapeEntity[], withSave?: boolean) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[]) => void
  saveShapes: () => void
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

export const useCanvasContext = (): CanvasContextType => {
  const ctx = useContext(CanvasContext)
  if (!ctx) {
    throw new Error('useCanvasContext must be used within a CanvasContext.Provider')
  }
  return ctx
}

export default CanvasContext
