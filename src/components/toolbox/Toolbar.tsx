import { menuIcon, shapesIcon } from 'constants/icons'
import React, { useEffect, useState } from 'react'
import type { ToolsType } from 'types/tools'
import Button from 'components/common/Button'
import { getCurrentStructure } from 'utils/toolbar'
import ToolbarGroup from './ToolbarGroup'
import MenuGroup from './MenuGroup'
import Tool from './Tool'
import Modal from 'components/common/Modal'
import PictureUrlModal from './PictureUrlInput'
import type { CustomTool } from 'types/tools'
import _ from 'lodash/fp'
import { CLEAR_TOOL, REDO_TOOL, SELECTION_TOOL, UNDO_TOOL } from 'constants/tools'
import type { ShapeType } from 'types/Shapes'
import './Toolbar.css'

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
  disabled?: boolean
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
  exportCanvasInFile: () => void
  availableTools: CustomTool[]
  withLoadAndSave: boolean
  withExport: boolean
  withUrlPicture: boolean
  withUploadPicture: boolean
}

const Toolbar = ({
  width,
  disabled = false,
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

  const fullToolbarSize = (5 + currentStructure.length) * TOOL_WIDTH
  const withMenuToolbarSize = (2 + currentStructure.length) * TOOL_WIDTH

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPictureUrlModalOpen, setIsPictureUrlModalOpen] = useState(false)
  const [actionsInMenu, setActionsInMenu] = useState(width < fullToolbarSize)
  const [toolsInMenu, setToolsInMenu] = useState(width < withMenuToolbarSize)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  const openPictureUrlModal = () => {
    setIsPictureUrlModalOpen(true)
  }

  const togglePictureUrlModal = () => {
    setIsPictureUrlModalOpen(prev => !prev)
  }

  const setActiveTool = (tool: ToolsType) => {
    setActiveToolFromProps(tool)
    setIsMenuOpen(false)
  }

  const setActiveToolFromId = (toolId: string) => {
    setActiveTool(availableTools.find(tool => tool.id === toolId) ?? activeTool)
  }

  useEffect(() => {
    setActionsInMenu(width < fullToolbarSize)
    setToolsInMenu(width < withMenuToolbarSize)
  }, [width, fullToolbarSize, withMenuToolbarSize])

  const isAnyToolSelected = _.find({ type: activeTool }, availableTools) !== undefined

  return (
    <>
      <div className='react-paint-editor-toolbar-toolbox'>
        {/* <Tool
        type="move"
        label="move"
        imgSrc={moveIcon}
        isActive={activeTool === "move"}
        setActive={setActiveTool}
      /> */}
        <div className='react-paint-editor-toolbar-shrinkable'>
          <Tool
            type={SELECTION_TOOL}
            disabled={disabled}
            img={SELECTION_TOOL.icon}
            isActive={activeTool.id === SELECTION_TOOL.id}
            setActive={setActiveTool}
          />
          {toolsInMenu ? (
            <Button
              disabled={disabled}
              onClick={toggleTools}
              title="Toggle tools"
              icon={shapesIcon}
              selected={isAnyToolSelected}
            />
          ) : (
            currentStructure.map((group, i) => (
              <ToolbarGroup
                disabled={disabled}
                key={i}
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
          vertical={true}
          alignment="right"
          group={{ title: 'Menu', img: menuIcon }}
          activeTool={activeTool}
          addPicture={addPicture}
          loadFile={loadFile}
          saveFile={saveFile}
          togglePictureUrlModal={openPictureUrlModal}
          exportCanvasInFile={exportCanvasInFile}
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
        <Modal className='react-paint-editor-toolbar-modal' onClose={toggleTools}>
          {availableTools.map((toolType, index) =>
            toolType.type === 'picture' ? null : (
              <Tool
                disabled={disabled}
                key={index}
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
      {isPictureUrlModalOpen && (
        <PictureUrlModal togglePictureUrlModal={togglePictureUrlModal} addPicture={addPicture} />
      )}
    </>
  )
}

export default Toolbar
