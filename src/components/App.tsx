import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DrawableShape,
  DrawableShapeJson,
  Point,
  StyledShape,
  ToolEnum,
  ToolsType
} from 'types/Shapes'
import Canvas from './Canvas'
import Layouts from './toolbox/Layouts'
import Toolbox from './toolbox/Toolbox'
import styled from 'styled-components'
import SettingsBox from './toolbox/SettingsBox'
import { STYLE_FONT_DEFAULT } from 'constants/style'
import { useKeyboard } from 'hooks/useKeyboard'
import {
  decodeJson,
  decodePicturesInShapes,
  downloadFile,
  encodeShapesInString,
  validateJson
} from 'utils/file'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import { useComponent } from 'hooks/useComponent'
import { useShapes } from 'hooks/useShapes'

const StyledApp = styled.div<{
  toolboxposition: 'top' | 'left'
  height: number
}>`
  display: flex;
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'column' : 'row')};
  ${({ height }) => `
  width:100%;
  height:${height}px;
  `}
`

const StyledRow = styled.div`
  display: flex;
  flex-direction: row;
`

type AppType = {
  hover?: boolean
  settingsHover?: boolean
  toolboxPosition?: 'top' | 'left'
  width?: number
  height?: number
  withLayouts?: boolean
}

const App = ({
  hover = false,
  settingsHover = false,
  toolboxPosition = 'top',
  width = 1000,
  height = 600,
  withLayouts = true
}: AppType) => {
  const componentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isInsideComponent } = useComponent({
    componentRef
  })

  const [defaultConf, setDefaultConf] = useState<StyledShape>({
    style: {
      fillColor: 'transparent',
      strokeColor: 'black',
      lineWidth: 1,
      lineDash: 0,
      lineArrow: 0,
      pointsCount: 2,
      fontFamily: STYLE_FONT_DEFAULT
    }
  })

  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(ToolEnum.selection)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: SelectionModeLib.default
  })

  const {
    shapesRef,
    selectedShape,
    addShape,
    moveShapes,
    setSelectedShape,
    removeShape,
    updateShape,
    backwardShape,
    forwardShape,
    clearShapes,
    saveShapes,
    canGoBackward,
    canGoForward,
    canClear
  } = useShapes()

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape]
  )

  const undoAction = useCallback(() => {
    selectTool(ToolEnum.selection)
    backwardShape()
  }, [selectTool, backwardShape])

  const redoAction = useCallback(() => {
    selectTool(ToolEnum.selection)
    forwardShape()
  }, [selectTool, forwardShape])

  const clearCanvas = useCallback(
    (shapesToInit: DrawableShape[] = []) => {
      clearShapes(shapesToInit)
      selectTool(ToolEnum.selection)
      setCanvasOffset([0, 0])
    },
    [selectTool, clearShapes]
  )

  const selectShape = useCallback(
    (shape: DrawableShape) => {
      setActiveTool(ToolEnum.selection)
      setSelectedShape(shape)
    },
    [setSelectedShape]
  )

  const pasteShape = useCallback(
    (shape: DrawableShape) => {
      addShape(shape)
      selectShape(shape)
    },
    [addShape, selectShape]
  )

  const exportCanvasInFile = useCallback(() => {
    const dataURL = canvasRef.current?.toDataURL('image/png')
    if (!dataURL) return
    downloadFile(dataURL, 'drawing.png')
  }, [])

  const saveFile = useCallback(() => {
    const content = encodeShapesInString(shapesRef.current)
    if (!content) return
    downloadFile(content, 'drawing.json')
  }, [shapesRef])

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const json = await decodeJson(file)
        const isValidated = validateJson(json)
        if (!isValidated) throw new Error('Le fichier est corrompu')
        const shapes = decodePicturesInShapes(json as DrawableShapeJson[])
        clearCanvas(shapes)
      } catch (e) {
        console.warn(e)
      }
    },
    [clearCanvas]
  )

  useKeyboard({
    isInsideComponent,
    isEditingText: selectionMode.mode === SelectionModeLib.textedition,
    selectedShape,
    setSelectedShape,
    removeShape,
    pasteShape,
    updateShape
  })

  useEffect(() => {
    if (!isInsideComponent) setSelectedShape(undefined)
  }, [isInsideComponent, setSelectedShape])

  return (
    <StyledApp ref={componentRef} toolboxposition={toolboxPosition} height={height} tabIndex={0}>
      <Toolbox
        activeTool={activeTool}
        clearCanvas={clearCanvas}
        setSelectedShape={setSelectedShape}
        setActiveTool={selectTool}
        exportCanvasInFile={exportCanvasInFile}
        saveFile={saveFile}
        loadFile={loadFile}
        addShape={addShape}
        hasActionToUndo={canGoBackward}
        hasActionToRedo={canGoForward}
        hasActionToClear={canClear}
        undoAction={undoAction}
        redoAction={redoAction}
        toolboxPosition={toolboxPosition}
        hover={hover}
      />
      <StyledRow>
        <Canvas
          isInsideComponent={isInsideComponent}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          canvasOffsetStartPosition={canvasOffsetStartPosition}
          setCanvasOffsetStartPosition={setCanvasOffsetStartPosition}
          shapes={shapesRef.current}
          addShape={addShape}
          updateSingleShape={updateShape}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
          canvasOffset={canvasOffset}
          setCanvasOffset={setCanvasOffset}
          defaultConf={defaultConf}
          saveShapes={saveShapes}
          ref={canvasRef}
          width={width}
          height={height}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
        />
        {withLayouts && (
          <Layouts
            shapes={shapesRef.current}
            moveShapes={moveShapes}
            selectedShape={selectedShape}
            removeShape={removeShape}
            selectShape={selectShape}
            hover={hover}
          />
        )}
      </StyledRow>
      {(!settingsHover || selectedShape) && (
        <SettingsBox
          activeTool={activeTool}
          settingsHover={settingsHover}
          selectedShape={selectedShape}
          removeShape={removeShape}
          updateShape={updateShape}
          defaultConf={defaultConf}
          setDefaultConf={setDefaultConf}
          canvas={canvasRef.current}
          givenWidth={width}
          givenHeight={height}
        />
      )}
    </StyledApp>
  )
}

export default App
