import { clearIcon, menuIcon, redoIcon, selectIcon, shapesIcon, undoIcon } from 'constants/icons'
import React, { useEffect, useState } from 'react'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import Button from 'components/common/Button'
import { getCurrentStructure } from 'utils/toolbar'
import ToolbarGroup from './ToolbarGroup'
import MenuGroup from './MenuGroup'
import Tool from './Tool'
import { getShapePicture } from 'utils/style'
import Modal from 'components/common/Modal'
import PictureUrlModal from './PictureUrlInput'

const ACTIONS_MENU_BREAKPOINT = 400
const TOOLS_MENU_BREAKPOINT = 280

const StyledShrinkableTools = styled.div`
  flex: 1;
  position: relative;
  height: 100%;
  text-align: center;
  max-height: 36px;
  overflow: hidden;
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
    tools: [ShapeEnum.brush],
    vertical: false
  },
  {
    title: 'lines',
    tools: [ShapeEnum.line, ShapeEnum.curve, ShapeEnum.polygon],
    vertical: false
  },
  {
    title: 'shapes',
    tools: [ShapeEnum.rect, ShapeEnum.square, ShapeEnum.circle, ShapeEnum.ellipse],
    vertical: false
  },
  ShapeEnum.text
]

type ToolboxType = {
  width: number
  disabled?: boolean
  activeTool: React.SetStateAction<ToolsType>
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
  availableTools: ShapeEnum[]
  withLoadAndSave: boolean
  withExport: boolean
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
  availableTools
}: ToolboxType) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPictureUrlModalOpen, setIsPictureUrlModalOpen] = useState(false)
  const [actionsInMenu, setActionsInMenu] = useState(width < ACTIONS_MENU_BREAKPOINT)
  const [toolsInMenu, setToolsInMenu] = useState(width < TOOLS_MENU_BREAKPOINT)

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

  useEffect(() => {
    setActionsInMenu(width < ACTIONS_MENU_BREAKPOINT)
    setToolsInMenu(width < TOOLS_MENU_BREAKPOINT)
  }, [width])

  const currentStructure = getCurrentStructure(availableTools, TOOLBAR_STRUCTURE)

  const isAnyToolSelected = availableTools.includes(activeTool as ShapeEnum)
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
        <MenuGroup
          withActionsInMenu={actionsInMenu}
          disabled={disabled}
          vertical={true}
          alignment="left"
          group={{ title: 'Menu', img: menuIcon }}
          activeTool={activeTool}
          addPicture={addPicture}
          loadFile={loadFile}
          saveFile={saveFile}
          togglePictureUrlModal={openPictureUrlModal}
          exportCanvasInFile={exportCanvasInFile}
          availableTools={availableTools}
          withLoadAndSave={withLoadAndSave}
          withExport={withExport}
          hasActionToUndo={hasActionToUndo}
          hasActionToRedo={hasActionToRedo}
          hasActionToClear={hasActionToClear}
          undoAction={undoAction}
          redoAction={redoAction}
          clearCanvas={clearCanvas}
        />
        <Tool
          type={ToolEnum.selection}
          disabled={disabled}
          lib="selection"
          img={selectIcon}
          isActive={activeTool === ToolEnum.selection}
          setActive={setActiveTool}
        />
        {!actionsInMenu && (
          <>
            <Tool
              type={ToolEnum.undo}
              disabled={disabled || !hasActionToUndo}
              lib="Undo"
              img={undoIcon}
              isActive={activeTool === ToolEnum.undo}
              setActive={undoAction}
            />
            <Tool
              type={ToolEnum.redo}
              disabled={disabled || !hasActionToRedo}
              lib="Redo"
              img={redoIcon}
              isActive={activeTool === ToolEnum.redo}
              setActive={redoAction}
            />
            <Tool
              type={ToolEnum.clear}
              disabled={disabled || !hasActionToClear}
              lib="Clear"
              img={clearIcon}
              isActive={activeTool === ToolEnum.clear}
              setActive={() => clearCanvas()}
            />
          </>
        )}
        <StyledShrinkableTools>
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
      </StyledToolbox>
      {isMenuOpen && (
        <StyledToolsModal onClose={toggleTools}>
          {availableTools.map(toolType =>
            toolType === ShapeEnum.picture ? null : (
              <Tool
                disabled={disabled}
                key={toolType}
                type={toolType}
                lib={toolType}
                withText={false}
                img={getShapePicture(toolType)}
                isActive={activeTool === toolType}
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
