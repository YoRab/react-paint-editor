import {
  clearIcon,
  dotsIcon,
  gestureIcon,
  lineIcon,
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
  z-index: 1;
`

const StyledShrinkableToolsInner = styled.div`
  display: inline-block;
  text-align: left;
  background: var(--bg-color);
  margin-right: 36px;
  text-align: right;

  & + * {
    position: absolute;
    right: 0;
    bottom: 36px;
  }
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
    img: lineIcon,
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
  addPicture: (file: File) => void
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
  setActiveTool,
  undoAction,
  redoAction,
  addPicture,
  loadFile,
  saveFile,
  exportCanvasInFile,
  availableTools
}: ToolboxType) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  const currentStructure = getCurrentStructure(availableTools, TOOLBAR_STRUCTURE)

  return (
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
        group={{ title: '', img: menuIcon }}
        activeTool={activeTool}
        addPicture={addPicture}
        loadFile={loadFile}
        saveFile={saveFile}
        exportCanvasInFile={exportCanvasInFile}
        availableTools={availableTools}
      />
    </StyledToolbox>
  )
}

export default Toolbar
