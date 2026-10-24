import type { OptionalOptions } from '@canvas/constants/app'
import type { ShapesState } from '@canvas/store/shapesReducer'
import type { CanvasSize } from '@canvas/types/Canvas'
import type { ResolvedOptions } from '@canvas/types/editor'
import type { HoverModeData, SelectionModeData } from '@canvas/types/Mode'
import type { Point, SelectionType, ShapeInput } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'

export type UseReactPaintProps = {
  width?: number | undefined
  height?: number | undefined
  shapes?: ShapeInput[] | undefined
  mode?: 'editor' | 'viewer' | undefined
  disabled?: boolean | undefined
  options?: OptionalOptions | undefined
}

export type PaintConfig = {
  width: number
  height: number
  mode: 'editor' | 'viewer'
  disabled: boolean
  options: ResolvedOptions
}

export type SelectionFrameState = { oldSelection: SelectionType | undefined; frame: [Point, Point] }

export type PanStart = { start: Point; originalOffset: Point }

export type CanvasTransformation = { offset: Point; zoom: number }

export type Modifiers = { shift: boolean; alt: boolean; space: boolean }

export type Focus = { component: boolean; canvas: boolean }

export type InternalState = {
  /** Props of the hook */
  config: PaintConfig
  /** Shapes, selection and history */
  document: ShapesState
  clipboard: SelectionType | undefined
  tools: { available: CustomTool[]; activeToolId: string }
  view: { canvasSize: CanvasSize; transformation: CanvasTransformation; gridGap: number }
  interaction: {
    selectionMode: SelectionModeData<Point | number>
    /** The hovered shape is read from the drawing by its id: it follows the changes of its shape, and goes with it */
    hoveredShapeId: string | undefined
    /** What the cursor would do on the selection: it gives the cursor of the canvas */
    hoverMode: HoverModeData
    selectionFrame: SelectionFrameState | undefined
    modifiers: Modifiers
    panStart: PanStart | undefined
    /** Speed of the auto scroll, while a selection frame is drawn close to the borders */
    moveAcceleration: Point
    focus: Focus
  }
}
