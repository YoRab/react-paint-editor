import {  menuIcon,shapesIcon } from 'constants/icons'
import React, { useEffect, useState } from 'react'
import { styled } from '@linaria/react'
import { ShapeEnum } from 'types/Shapes'
import {   ToolsType } from 'types/tools'
import Button from 'components/common/Button'
import { getCurrentStructure } from 'utils/toolbar'
import ToolbarGroup from './ToolbarGroup'
import MenuGroup from './MenuGroup'
import Tool from './Tool'
import Modal from 'components/common/Modal'
import PictureUrlModal from './PictureUrlInput'
import { CustomTool } from 'types/tools'
import _ from 'lodash/fp'
import { CLEAR_TOOL, REDO_TOOL, SELECTION_TOOL, UNDO_TOOL } from 'constants/tools'

const TOOL_WIDTH = 40

const StyledShrinkableTools = styled.div`
  flex: 1;
  position: relative;
  height: 100%;
  text-align: center;
  height: 36px;
`

const StyledToolbox = styled.div`
  display: flex;
  max-height: 36px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--divider-color);
  box-sizing: border-box;
`

const StyledToolsModal = styled(Modal)`
  grid-template-columns: 1fr 1fr 1fr;
`

const TOOLBAR_STRUCTURE = [
  {
    title: 'brush',
    toolsType: [ShapeEnum.brush],
    vertical: false
  },
  {
    title: 'lines',
    toolsType: [ShapeEnum.line, ShapeEnum.curve, ShapeEnum.polygon],
    vertical: false
  },
  {
    title: 'shapes',
    toolsType: [ShapeEnum.rect, ShapeEnum.square, ShapeEnum.circle, ShapeEnum.ellipse],
    vertical: false
  },
  ShapeEnum.text
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

  const fullToolbarSize = ((5  + currentStructure.length) * TOOL_WIDTH)
  const withMenuToolbarSize = ((2  + currentStructure.length) * TOOL_WIDTH)

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
  //360 240

  useEffect(() => {
    setActionsInMenu(width < fullToolbarSize)
    setToolsInMenu(width < withMenuToolbarSize)
  }, [width, fullToolbarSize, withMenuToolbarSize])



  const isAnyToolSelected = _.find({ type: activeTool }, availableTools) !== undefined

  return (
    <>
      <StyledToolbox>
        {/* <Tool
        type={ToolEnum.move}
        lib="move"
        imgSrc={moveIcon}
        isActive={activeTool === ToolEnum.move}
        setActive={setActiveTool}
      /> */}
        <StyledShrinkableTools>
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
                setActiveTool={setActiveTool}
              />
            ))
          )}
        </StyledShrinkableTools>
       
       
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
              setActive={() => clearCanvas()}
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
      </StyledToolbox>
      {isMenuOpen && (
        <StyledToolsModal onClose={toggleTools}>
          {availableTools.map((toolType, index) =>
            toolType.type === ShapeEnum.picture ? null : (
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
        </StyledToolsModal>
      )}
      {isPictureUrlModalOpen && (
        <PictureUrlModal togglePictureUrlModal={togglePictureUrlModal} addPicture={addPicture} />
      )}
    </>
  )
}

export default Toolbar
