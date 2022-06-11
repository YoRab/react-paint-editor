import {
  clearIcon,
  dotsIcon,
  gestureIcon,
  arrowIcon,
  menuIcon,
  redoIcon,
  selectIcon,
  shapesIcon,
  undoIcon
} from 'constants/icons'
import React, { useState } from 'react'
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

const StyledShrinkableTools = styled.div`
  flex: 1;
  position: relative;
  height: 100%;
  text-align: center;
  max-height: 72px;
`

const StyledToolbox = styled.div`
  display: flex;
  max-height: 36px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  box-sizing: border-box;
`

const StyledShrinkableToolsInner = styled.div`
  display: inline-block;
  text-align: left;
  margin-right: 36px;
  text-align: right;

  & + * {
    position: absolute;
    right: 0;
    bottom: 36px;
  }
`

const StyledToolsModal = styled(Modal)`
  grid-template-columns: 1fr 1fr 1fr;
`

const TOOLBAR_STRUCTURE = [
  {
    title: 'brush',
    img: gestureIcon,
    tools: [ShapeEnum.brush],
    vertical: false
  },
  {
    title: 'lines',
    img: arrowIcon,
    tools: [ShapeEnum.line, ShapeEnum.curve, ShapeEnum.polygon],
    vertical: false
  },
  {
    title: 'shapes',
    img: shapesIcon,
    tools: [ShapeEnum.rect, ShapeEnum.square, ShapeEnum.circle, ShapeEnum.ellipse],
    vertical: false
  },
  ShapeEnum.text
]

type ToolboxType = {
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
}

const Toolbar = ({
  disabled = false,
  activeTool,
  hasActionToUndo = false,
  hasActionToRedo = false,
  hasActionToClear = false,
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

  const currentStructure = getCurrentStructure(availableTools, TOOLBAR_STRUCTURE)

  return (
    <>
      <StyledToolbox>
        <Tool
          type={ToolEnum.selection}
          disabled={disabled}
          lib="selection"
          img={selectIcon}
          isActive={activeTool === ToolEnum.selection}
          setActive={setActiveTool}
        />
        {/* <Tool
        type={ToolEnum.move}
        lib="move"
        imgSrc={moveIcon}
        isActive={activeTool === ToolEnum.move}
        setActive={setActiveTool}
      /> */}
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
        <StyledShrinkableTools>
          <StyledShrinkableToolsInner>
            {currentStructure.map((group, i) => (
              <ToolbarGroup
                disabled={disabled}
                key={i}
                activeTool={activeTool}
                group={group}
                setActiveTool={setActiveTool}
              />
            ))}
          </StyledShrinkableToolsInner>
          <Button disabled={disabled} onClick={toggleTools} title="Toggle tools" icon={dotsIcon} />
        </StyledShrinkableTools>

        <MenuGroup
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
          availableTools={availableTools}
        />
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
