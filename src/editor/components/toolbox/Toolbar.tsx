import { type EditorState, type ExportView, type ShapeType, shallowEqual, type ToolsType, usePaint, usePaintState } from '@canvas/index'
import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import { shapesIcon } from '@editor/constants/icons'
import { CLEAR_TOOL, MOVE_TOOL_DISPLAY, REDO_TOOL, SELECTION_TOOL_DISPLAY, UNDO_TOOL } from '@editor/constants/tools'
import { getDisplayTool } from '@editor/utils/style'
import { getCurrentStructure } from '@editor/utils/toolbar'
import { useMemo, useState } from 'react'
import MenuGroup from './MenuGroup'
import PictureUrlModal from './PictureUrlInput'
import Tool from './Tool'
import './Toolbar.css'
import ExportModal from '@editor/components/toolbox/ExportModal'
import ActionButton from './ActionButton'
import ToolbarGroup from './ToolbarGroup'

const TOOL_WIDTH = 40

const TOOLBAR_STRUCTURE: (
  | ShapeType
  | {
      title: string
      toolsType: ShapeType[]
      vertical: boolean
    }
)[] = [
  {
    title: 'brush',
    toolsType: ['brush'],
    vertical: false
  },
  {
    title: 'lines',
    toolsType: ['line', 'curve', 'polygon'],
    vertical: false
  },
  {
    title: 'shapes',
    toolsType: ['rect', 'square', 'circle', 'ellipse'],
    vertical: false
  },
  'text'
]

const selectToolbarState = (state: EditorState) => ({
  activeTool: state.activeTool,
  tools: state.tools,
  history: state.history,
  width: state.view.displayWidth
})

type ToolboxType = {
  disabled: boolean
  withMoveTool: boolean
  loadFile: (file: File) => void
  addPicture: (file: File | string) => Promise<void>
  saveFile: () => void
  exportCanvasInFile: (view: ExportView) => void
  withLoadAndSave: boolean
  withExport: boolean
  withUrlPicture: boolean
  withUploadPicture: boolean
}

const Toolbar = ({
  disabled,
  withMoveTool,
  withLoadAndSave,
  withExport,
  addPicture,
  loadFile,
  saveFile,
  exportCanvasInFile,
  withUrlPicture,
  withUploadPicture
}: ToolboxType) => {
  const paint = usePaint()
  const { actions } = paint
  const { activeTool, tools, history, width } = usePaintState(paint, selectToolbarState, shallowEqual)
  const availableTools = useMemo(() => tools.map(getDisplayTool), [tools])
  const { canUndo: hasActionToUndo, canRedo: hasActionToRedo, canClear: hasActionToClear } = history
  const { undo: undoAction, redo: redoAction, clearCanvas } = actions

  const currentStructure = getCurrentStructure(availableTools, TOOLBAR_STRUCTURE)

  const fullToolbarSize = (6 + currentStructure.length) * TOOL_WIDTH
  const actionsInMenu = width < fullToolbarSize

  const withMenuToolbarSize = (3 + currentStructure.length) * TOOL_WIDTH
  const toolsInMenu = width < withMenuToolbarSize
  const minWidth = 4 * TOOL_WIDTH

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPictureUrlModalOpen, setIsPictureUrlModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  const openPictureUrlModal = () => {
    setIsPictureUrlModalOpen(true)
  }

  const togglePictureUrlModal = () => {
    setIsPictureUrlModalOpen(prev => !prev)
  }

  const toggleExportModal = () => {
    setIsExportModalOpen(prev => !prev)
  }

  const setActiveTool = (toolOrId: ToolsType | string) => {
    actions.selectTool(toolOrId)
    setIsMenuOpen(false)
  }

  const isAnyToolSelected = availableTools.find(tool => tool.type === activeTool.type) !== undefined

  return (
    <>
      <div
        className='react-paint-editor-toolbar-toolbox'
        style={{
          '--react-paint-editor-toolbar-minwidth': `${minWidth}px`
        }}
      >
        <div className='react-paint-editor-toolbar-shrinkable'>
          <Tool
            type={SELECTION_TOOL_DISPLAY}
            disabled={disabled}
            img={SELECTION_TOOL_DISPLAY.icon}
            isActive={activeTool.id === SELECTION_TOOL_DISPLAY.id}
            setActive={() => setActiveTool(SELECTION_TOOL_DISPLAY.id)}
          />
          {withMoveTool && (
            <Tool
              type={MOVE_TOOL_DISPLAY}
              disabled={disabled}
              img={MOVE_TOOL_DISPLAY.icon}
              isActive={activeTool.id === MOVE_TOOL_DISPLAY.id}
              setActive={() => setActiveTool(MOVE_TOOL_DISPLAY.id)}
            />
          )}
          {toolsInMenu ? (
            <Button disabled={disabled} onClick={toggleTools} title='Toggle tools' icon={shapesIcon} selected={isAnyToolSelected} />
          ) : (
            currentStructure.map(group => (
              <ToolbarGroup
                disabled={disabled}
                key={'id' in group ? group.id : group.title}
                activeTool={activeTool}
                group={group}
                setActiveToolFromId={setActiveTool}
              />
            ))
          )}
        </div>

        {!actionsInMenu && (
          <>
            <ActionButton type={UNDO_TOOL} disabled={disabled || !hasActionToUndo} onClick={undoAction} />
            <ActionButton type={REDO_TOOL} disabled={disabled || !hasActionToRedo} onClick={redoAction} />
            <ActionButton type={CLEAR_TOOL} disabled={disabled || !hasActionToClear} onClick={clearCanvas} />
          </>
        )}
        <MenuGroup
          withActionsInMenu={actionsInMenu}
          disabled={disabled}
          addPicture={addPicture}
          loadFile={loadFile}
          saveFile={saveFile}
          togglePictureUrlModal={openPictureUrlModal}
          toggleExportModal={toggleExportModal}
          withUploadPicture={withUploadPicture}
          withUrlPicture={withUrlPicture}
          withLoadAndSave={withLoadAndSave}
          withExport={withExport}
          hasActionToUndo={hasActionToUndo}
          hasActionToRedo={hasActionToRedo}
          hasActionToClear={hasActionToClear}
          undoAction={undoAction}
          redoAction={redoAction}
          clearCanvas={clearCanvas}
        />
      </div>
      {isMenuOpen && (
        <Modal className='react-paint-editor-toolbar-modal' onClose={toggleTools} title='Outils'>
          {availableTools.map(toolType =>
            toolType.type === 'picture' ? null : (
              <Tool
                disabled={disabled}
                key={toolType.id}
                type={toolType}
                img={toolType.icon}
                withText={false}
                isActive={activeTool.id === toolType.id}
                setActive={() => setActiveTool(toolType.id)}
              />
            )
          )}
        </Modal>
      )}
      {isPictureUrlModalOpen && <PictureUrlModal togglePictureUrlModal={togglePictureUrlModal} addPicture={addPicture} />}
      {isExportModalOpen && <ExportModal toggleExportModal={toggleExportModal} exportCanvasInFile={exportCanvasInFile} />}
    </>
  )
}

export default Toolbar
