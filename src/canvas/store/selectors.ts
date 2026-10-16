import type { UtilsSettings } from '@canvas/constants/app'
import { MOVE_TOOL, SELECTION_TOOL } from '@canvas/constants/tools'
import type { InternalState } from '@canvas/store/types'
import type { CanvasSize } from '@canvas/types/Canvas'
import type { ContextMenuState, EditorState, InteractionState } from '@canvas/types/editor'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool, ToolsType } from '@canvas/types/tools'
import { shallowEqual } from '@canvas/utils/equality'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { canRemoveShapePoint } from '@canvas/utils/shapes'

/** The text being edited, shown in a text box over the canvas */
type TextEdition = { shape: ShapeEntity<'text'>; defaultValue: string[]; settings: UtilsSettings }

export type CanvasView = {
  width: number
  height: number
  canvasSize: CanvasSize
  canGrow: boolean
  canShrink: boolean
  isEditMode: boolean
  features: UtilsSettings['features']
  textEdition: TextEdition | undefined
}

/** Memoizes the last result of a function, its arguments being compared one by one with Object.is */
export const memoizeLast = <A extends unknown[], R>(compute: (...args: A) => R): ((...args: A) => R) => {
  let lastArgs: A | undefined
  let lastResult: R
  return (...args: A) => {
    if (shallowEqual(lastArgs, args)) return lastResult
    lastArgs = args
    lastResult = compute(...args)
    return lastResult
  }
}

/** Returns the previous object while the new one has the same values, so that it keeps its identity */
const keepIfSame = <T extends object>() => {
  let last: T | undefined
  return (next: T): T => {
    if (last === undefined || !shallowEqual(last, next)) last = next
    return last
  }
}

/** One of the selection tool, the move tool or the available tools, found by id */
export const findSelectableTool = (available: CustomTool[], id: string): ToolsType | undefined =>
  [SELECTION_TOOL, MOVE_TOOL, ...available].find(tool => tool.id === id)

/**
 * Selectors of a store. Each slice keeps its identity while its values are unchanged:
 * the editor state is the same object as long as nothing it exposes has changed.
 */
export const createSelectors = () => {
  const buildFeatures = memoizeLast((isEditMode: boolean, disabled: boolean, canZoom: 'never' | 'always') => ({
    edition: isEditMode && !disabled,
    zoom: canZoom === 'always' && !disabled
  }))

  const selectFeatures = ({ config }: InternalState) => buildFeatures(config.mode !== 'viewer', config.disabled, config.options.canZoom)

  /** Whether the canvas reacts to the user: it can be edited or zoomed */
  const selectIsInteractive = (state: InternalState) => {
    const { edition, zoom } = selectFeatures(state)
    return edition || zoom
  }

  const buildSettings = memoizeLast(
    (
      brushAlgo: UtilsSettings['brushAlgo'],
      isBrushShapeDoneOnMouseUp: boolean,
      debug: boolean,
      size: UtilsSettings['size'],
      selectionPadding: number,
      canvasSize: CanvasSize,
      canvasOffset: Point,
      canvasZoom: number,
      gridGap: number,
      features: UtilsSettings['features']
    ): UtilsSettings => ({
      brushAlgo,
      isBrushShapeDoneOnMouseUp,
      debug,
      canvasSize: {
        realWidth: canvasSize.realWidth,
        realHeight: canvasSize.realHeight,
        width: canvasSize.width,
        height: canvasSize.height,
        scaleRatioWithNoZoom: canvasSize.scaleRatio,
        scaleRatio: canvasSize.scaleRatio * canvasZoom
      },
      size,
      canvasOffset,
      canvasZoom,
      gridGap,
      selectionPadding,
      features
    })
  )

  /** Settings given to the drawing utils */
  const selectSettings = memoizeLast((state: InternalState): UtilsSettings => {
    const { options } = state.config
    const { canvasSize, transformation, gridGap } = state.view
    return buildSettings(
      options.brushAlgo,
      options.isBrushShapeDoneOnMouseUp,
      options.debug,
      options.size,
      options.canvasSelectionPadding,
      canvasSize,
      transformation.offset,
      transformation.zoom,
      gridGap,
      selectFeatures(state)
    )
  })

  const buildActiveTool = memoizeLast(
    (available: CustomTool[], activeToolId: string): ToolsType => findSelectableTool(available, activeToolId) ?? SELECTION_TOOL
  )

  /** The active tool is derived from the tools by its id, so that it follows their updates */
  const selectActiveTool = ({ tools }: InternalState) => buildActiveTool(tools.available, tools.activeToolId)

  const selectSelectedShapes = memoizeLast(getSelectedShapes)

  const keepSelectedShapeIds = keepIfSame<string[]>()
  const selectSelectedShapeIds = memoizeLast((selectedShapes: ShapeEntity[]) => keepSelectedShapeIds(selectedShapes.map(shape => shape.id)))

  const selectWithContextMenu = ({ config }: InternalState) => config.options.withContextMenu && config.mode !== 'viewer' && !config.disabled

  const keepLayout = keepIfSame<EditorState['layout']>()
  const keepView = keepIfSame<EditorState['view']>()
  const keepHistory = keepIfSame<EditorState['history']>()
  const keepClipboard = keepIfSame<EditorState['clipboard']>()
  const keepInteraction = keepIfSame<InteractionState>()
  const keepEditorState = keepIfSame<EditorState>()

  const buildContextMenu = memoizeLast((withContextMenu: boolean, selectionMode: SelectionModeData<Point | number>): ContextMenuState | undefined => {
    if (!withContextMenu || selectionMode.mode !== 'contextMenu') return undefined
    const contextMenuShapes = getSelectedShapes(selectionMode.originalShape)
    const anchorIndex = typeof selectionMode.anchor === 'number' ? selectionMode.anchor : undefined
    return {
      shapes: contextMenuShapes,
      anchorIndex,
      canRemoveAnchor: contextMenuShapes.length === 1 && canRemoveShapePoint(contextMenuShapes[0], anchorIndex),
      canvasPosition: selectionMode.cursorStartPosition,
      clientPosition: selectionMode.clientPosition
    }
  })

  /** State exposed to the editors */
  const selectEditorState = memoizeLast((state: InternalState): EditorState => {
    const { config, document, view, interaction } = state
    const { history } = document
    const { zoom, offset } = view.transformation
    const withContextMenu = selectWithContextMenu(state)
    const selectedShapes = selectSelectedShapes(document.selectedShape)
    return keepEditorState({
      mode: config.mode,
      disabled: config.disabled,
      features: selectFeatures(state),
      width: config.width,
      height: config.height,
      layout: keepLayout({ size: config.options.size, canGrow: config.options.canGrow, canShrink: config.options.canShrink }),
      view: keepView({
        zoom,
        offset,
        displayWidth: view.canvasSize.width,
        displayHeight: view.canvasSize.height,
        scaleRatio: view.canvasSize.scaleRatio * zoom
      }),
      gridGap: view.gridGap,
      shapes: document.shapes,
      selection: document.selectedShape,
      selectedShapes,
      selectedShapeIds: selectSelectedShapeIds(selectedShapes),
      activeTool: selectActiveTool(state),
      tools: state.tools.available,
      history: keepHistory({
        canUndo: history.cursor > 0,
        canRedo: history.cursor < history.states.length - 1,
        canClear: document.shapes.length > 0
      }),
      clipboard: keepClipboard({ hasContent: state.clipboard !== undefined }),
      withContextMenu,
      interaction: keepInteraction({
        mode: interaction.selectionMode.mode,
        hoveredShape: interaction.hoveredShape,
        selectionFrame: interaction.selectionFrame?.frame,
        modifiers: interaction.modifiers,
        isPanning: interaction.panStart !== undefined,
        focus: interaction.focus
      }),
      contextMenu: buildContextMenu(withContextMenu, interaction.selectionMode)
    })
  })

  // --- Canvas component ---

  const buildTextEdition = memoizeLast(
    (selectionMode: SelectionModeData<Point | number>, selection: SelectionType | undefined, settings: UtilsSettings): TextEdition | undefined => {
      if (selectionMode.mode !== 'textedition') return undefined
      const shape = getSelectedShapes(selection)[0]
      return shape?.type === 'text' ? { shape, defaultValue: selectionMode.defaultValue, settings } : undefined
    }
  )

  const keepCanvasView = keepIfSame<CanvasView>()

  /** What the Canvas component renders: it does not change during the gestures, which are drawn outside of React */
  const selectCanvasView = memoizeLast((state: InternalState): CanvasView => {
    const { config, view, document, interaction } = state
    return keepCanvasView({
      width: config.width,
      height: config.height,
      canvasSize: view.canvasSize,
      canGrow: config.options.canGrow,
      canShrink: config.options.canShrink,
      isEditMode: config.mode !== 'viewer',
      features: selectFeatures(state),
      textEdition: buildTextEdition(interaction.selectionMode, document.selectedShape, selectSettings(state))
    })
  })

  const selectCursor = (state: InternalState): string => {
    const { panStart, hoverMode, modifiers } = state.interaction
    const activeTool = selectActiveTool(state)
    if (panStart) return 'grabbing'
    if (hoverMode.outOfView) return 'default'
    if (hoverMode.mode === 'resize') return 'pointer'
    if (activeTool.type !== 'selection' && activeTool.type !== 'move') return 'crosshair'
    if (hoverMode.mode === 'translate') return 'move'
    if (hoverMode.mode === 'rotate' || activeTool.type === 'move' || modifiers.space) return 'grab'
    return 'default'
  }

  return {
    selectFeatures,
    selectIsInteractive,
    selectSettings,
    selectActiveTool,
    selectSelectedShapes,
    selectWithContextMenu,
    selectEditorState,
    selectCanvasView,
    selectCursor
  }
}
