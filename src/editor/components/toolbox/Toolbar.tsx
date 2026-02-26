import type { ShapeType } from '@common/types/Shapes'
import type { CustomTool, ToolsType } from '@common/types/tools'
import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import { menuIcon, shapesIcon } from '@editor/constants/icons'
import { CLEAR_TOOL, MOVE_TOOL, REDO_TOOL, SELECTION_TOOL, UNDO_TOOL } from '@editor/constants/tools'
import { getCurrentStructure } from '@editor/utils/toolbar'
import { useState } from 'react'
import MenuGroup from './MenuGroup'
import PictureUrlModal from './PictureUrlInput'
import Tool from './Tool'
import './Toolbar.css'
import type { UtilsSettings } from '@canvas/constants/app'
import ExportModal from '@editor/components/toolbox/ExportModal'
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

type ToolboxType = {
  width: number
  activeTool: ToolsType
  hasActionToUndo?: boolean
  hasActionToRedo?: boolean
  hasActionToClear?: boolean
  undoAction: () => void
  redoAction: () => void
  clearCanvas: () => void
  setActiveTool: (tool: ToolsType) => void
  loadFile: (file: File) => void
  addPicture: (file: File | string) => Promise<void>
  saveFile: () => void
  exportCanvasInFile: (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => void
  availableTools: CustomTool[]
  withLoadAndSave: boolean
  withExport: boolean
  withUrlPicture: boolean
  withUploadPicture: boolean
  settings: UtilsSettings
}

const Toolbar = ({
  settings,
  width,
  activeTool,
  hasActionToUndo = false,
  hasActionToRedo = false,
  hasActionToClear = false,
  withLoadAndSave,
  withExport,
  clearCanvas,
  setActiveTool: setActiveToolFromProps,
  undoAction,
  redoAction,
  addPicture,
  loadFile,
  saveFile,
  exportCanvasInFile,
  availableTools,
  withUrlPicture,
  withUploadPicture
}: ToolboxType) => {
  const currentStructure = getCurrentStructure(availableTools, TOOLBAR_STRUCTURE)
  const disabled = !settings.features.edition

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

  const setActiveTool = (tool: ToolsType) => {
    setActiveToolFromProps(tool)
    setIsMenuOpen(false)
  }

  const setActiveToolFromId = (toolId: string) => {
    setActiveTool(availableTools.find(tool => tool.id === toolId) ?? activeTool)
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
            type={SELECTION_TOOL}
            disabled={disabled}
            img={SELECTION_TOOL.icon}
            isActive={activeTool.id === SELECTION_TOOL.id}
            setActive={setActiveTool}
          />
          {(settings.size === 'infinite' || settings.features.zoom) && (
            <Tool type={MOVE_TOOL} disabled={disabled} img={MOVE_TOOL.icon} isActive={activeTool.id === MOVE_TOOL.id} setActive={setActiveTool} />
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
                setActiveToolFromId={setActiveToolFromId}
              />
            ))
          )}
        </div>

        {!actionsInMenu && (
          <>
            <Tool
              type={UNDO_TOOL}
              disabled={disabled || !hasActionToUndo}
              img={UNDO_TOOL.icon}
              isActive={activeTool.id === UNDO_TOOL.id}
              setActive={undoAction}
            />
            <Tool
              type={REDO_TOOL}
              disabled={disabled || !hasActionToRedo}
              img={REDO_TOOL.icon}
              isActive={activeTool.id === REDO_TOOL.id}
              setActive={redoAction}
            />
            <Tool
              type={CLEAR_TOOL}
              disabled={disabled || !hasActionToClear}
              img={CLEAR_TOOL.icon}
              isActive={activeTool.id === CLEAR_TOOL.id}
              setActive={clearCanvas}
            />
          </>
        )}
        <MenuGroup
          withActionsInMenu={actionsInMenu}
          disabled={disabled}
          activeTool={activeTool}
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
                setActive={setActiveTool}
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
