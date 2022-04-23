import {
  clearIcon,
  dotsIcon,
  exportFileIcon,
  openFileIcon,
  pictureIcon,
  redoIcon,
  saveIcon,
  selectIcon,
  undoIcon
} from 'constants/icons'
import _ from 'lodash/fp'
import React, { useRef, useState } from 'react'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'
import Button from 'components/common/Button'

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

  &[data-menu-open='0'] {
    overflow: hidden;
  }
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

type ToolType = {
  type: ToolsType
  lib: string
  img?: string
  isActive: boolean
  disabled?: boolean
  setActive: (marker: ToolsType) => void
}

const Tool = ({ type, lib, img, isActive, disabled = false, setActive }: ToolType) => {
  const handleClick = () => {
    setActive(type)
  }

  return (
    <Button
      disabled={disabled}
      selected={isActive}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: img ? img : lib }}></Button>
  )
}

type LoadFileToolType = {
  disabled?: boolean
  loadFile: (file: File) => void
  lib: string
  img?: string
  accept: string
}

const LoadFileTool = ({ disabled = false, loadFile, lib, img, accept }: LoadFileToolType) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0)
    if (!file) return
    loadFile(file)
  }

  return (
    <Button
      ref={inputRef}
      type="file"
      onClick={handleClick}
      onChange={handleChange}
      accept={accept}
      disabled={disabled}>
      {img ? <span dangerouslySetInnerHTML={{ __html: img }} /> : lib}
    </Button>
  )
}

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
  exportCanvasInFile
}: ToolboxType) => {
  const toolsTypes: ShapeEnum[] = [
    ShapeEnum.brush,
    ShapeEnum.line,
    ShapeEnum.polygon,
    ShapeEnum.curve,
    ShapeEnum.rect,
    ShapeEnum.square,
    ShapeEnum.circle,
    ShapeEnum.ellipse,
    ShapeEnum.text
  ]

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  return (
    <StyledToolbox data-menu-open={+isMenuOpen}>
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
          {_.map(
            toolType => (
              <Tool
                disabled={disabled}
                key={toolType}
                type={toolType}
                lib={toolType}
                img={getShapePicture(toolType)}
                isActive={activeTool === toolType}
                setActive={setActiveTool}
              />
            ),
            toolsTypes
          )}
          <LoadFileTool
            disabled={disabled}
            loadFile={addPicture}
            lib="Image"
            img={pictureIcon}
            accept="image/png, image/gif, image/jpeg"
          />
        </StyledShrinkableToolsInner>
        <Button
          disabled={disabled}
          onClick={toggleTools}
          dangerouslySetInnerHTML={{ __html: dotsIcon }}
        />
      </StyledShrinkableTools>

      <LoadFileTool
        disabled={disabled}
        loadFile={loadFile}
        lib="Load file"
        img={openFileIcon}
        accept="application/JSON"
      />

      <Tool
        disabled={disabled}
        type={ToolEnum.saveFile}
        lib="Save file"
        img={saveIcon}
        isActive={activeTool === ToolEnum.saveFile}
        setActive={saveFile}
      />

      <Tool
        disabled={disabled}
        type={ToolEnum.export}
        lib="Export"
        img={exportFileIcon}
        isActive={activeTool === ToolEnum.export}
        setActive={exportCanvasInFile}
      />
    </StyledToolbox>
  )
}

export default Toolbar
